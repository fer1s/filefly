import { useEffect, useMemo, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

import { DRAG_OVER_CLASS } from "../useEntryDragMove/constants";
import { isOwnDrag, clearOwnDragPaths } from "../../nativeDragSource";
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

  // The folder row whose rect contains the CSS-pixel point (x, y), or null.
  const folderAtCss = (x: number, y: number) => {
    const items = document.querySelectorAll<HTMLElement>(".dir_entry_item");
    for (const el of items) {
      const b = el.getBoundingClientRect();
      if (x < b.left || x > b.right || y < b.top || y > b.bottom) continue;
      return el.id && dirPathsRef.current.has(el.id) ? el : null;
    }
    return null;
  };

  // The folder under a Tauri drag position. Tauri reports physical pixels, so divide by the device
  // pixel ratio for CSS px. (We used to also retry with the raw coords as a fallback, but on a
  // Retina display those are 2x off and can hit-test a *different* row when the drop was actually on
  // empty space — popping a bogus move/copy confirm. Trust the dpr-corrected point only.)
  const folderAt = (posX: number, posY: number) => {
    const dpr = window.devicePixelRatio || 1;
    return folderAtCss(posX / dpr, posY / dpr);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let disposed = false;

    void getCurrentWebview()
      .onDragDropEvent(({ payload }) => {
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
