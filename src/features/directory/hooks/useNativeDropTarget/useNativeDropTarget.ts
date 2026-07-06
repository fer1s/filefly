import { useEffect, useMemo, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

import { DRAG_OVER_CLASS } from "../useEntryDragMove/constants";
import { isOwnDrag, clearOwnDragPaths } from "../../nativeDragSource";
import { entryElementAt } from "../../dropTarget";
import { recordDragOver, recordDragEvent } from "../../dragDiagnostics";
import type { UseNativeDropTargetArgs } from "./types";

// Handles a native OS drag while it's over our window: highlights the folder under the cursor and,
// on drop, hands the dropped paths to `onDropFiles` — onto the hovered folder, or (on empty space)
// the current directory. This lets a drag that left the window (see useEntryDragMove) resume its
// in-app behaviour on return — @use-gesture can't, since the OS owns the gesture once the native
// drag starts — and enables dropping files dragged in from other apps.
export const useNativeDropTarget = ({
  entries,
  currentDir,
  onDropFiles,
}: UseNativeDropTargetArgs) => {
  const dirPaths = useMemo(
    () => new Set(entries.filter((e) => e.metadata.isDir).map((e) => e.path)),
    [entries],
  );

  // Latest values for the once-registered listener (written in an effect, never during render).
  const dirPathsRef = useRef(dirPaths);
  const currentDirRef = useRef(currentDir);
  const onDropFilesRef = useRef(onDropFiles);
  useEffect(() => {
    dirPathsRef.current = dirPaths;
    currentDirRef.current = currentDir;
    onDropFilesRef.current = onDropFiles;
  });

  const targetElRef = useRef<HTMLElement | null>(null);
  const clearTarget = () => {
    targetElRef.current?.classList.remove(DRAG_OVER_CLASS);
    targetElRef.current = null;
  };

  // Coordinate-independent marker: set whenever a native drag is anywhere over the window, so we
  // can tell the OS drag-drop events actually reach us (vs. a hit-test/coordinate problem).
  const NATIVE_DRAG_CLASS = "is-native-drag-over";
  const setActive = (active: boolean) =>
    document.body.classList.toggle(NATIVE_DRAG_CLASS, active);

  // The folder row under the CSS-pixel point (x, y), or null. Forgiving hit-test (tile + label,
  // nearest when crowded) so folders highlight reliably even at high zoom — see entryElementAt.
  const folderAtCss = (x: number, y: number) =>
    entryElementAt(x, y, (el) => !!el.id && dirPathsRef.current.has(el.id));

  // The folder under a Tauri drag position. Tauri's onDragDropEvent reports the position in LOGICAL
  // (CSS) pixels — the same space as getBoundingClientRect — so it's used directly. (It historically
  // reported physical pixels, which needed dividing by devicePixelRatio; a Tauri update changed that,
  // and the stale /dpr halved the point on Retina, dropping the hit-test above the real cursor —
  // verified via `sfb ui-probe`.)
  const folderAt = (posX: number, posY: number) => {
    const el = folderAtCss(posX, posY);
    // Capture for the headless probe so a real drag can be inspected after the fact.
    recordDragOver({
      rawX: posX,
      rawY: posY,
      dpr: window.devicePixelRatio || 1,
      cssX: posX,
      cssY: posY,
      resolved: el?.id ?? null,
    });
    return el;
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    void getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
        recordDragEvent(payload.type);
        if (payload.type === "enter" || payload.type === "over") {
          setActive(true);
          const el = folderAt(payload.position.x, payload.position.y);
          if (el !== targetElRef.current) {
            clearTarget();
            if (el) {
              el.classList.add(DRAG_OVER_CLASS);
              targetElRef.current = el;
            }
          }
        } else if (payload.type === "drop") {
          // Trust the folder highlighted by the last `over` (targetElRef), NOT a fresh hit-test on
          // the drop position: the drop position can resolve a folder even when the user released on
          // empty space (popping a bogus move confirm for a drag that lands in the current dir). The
          // in-app drag path already commits to the highlighted target — mirror it here.
          const el = targetElRef.current;
          clearTarget();
          setActive(false);
          const external = !isOwnDrag(payload.paths);
          clearOwnDragPaths();
          // Drop target: the hovered folder. On empty space, an external drag imports into the
          // current directory, but an own drag dropped on empty space has no target (its items
          // already live here) — ignore it rather than prompting a pointless move.
          const dest = el?.id ?? (external ? currentDirRef.current : undefined);
          if (dest && payload.paths.length)
            onDropFilesRef.current(payload.paths, dest, external);
        } else if (payload.type === "leave") {
          clearTarget();
          setActive(false);
          clearOwnDragPaths();
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });

    return () => {
      disposed = true;
      unlisten?.();
      clearTarget();
      setActive(false);
    };
    // Register the OS drag-drop listener once; the handlers read live values via refs/the DOM.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
