import { useEffect, useMemo, useRef } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";

import { DRAG_OVER_CLASS } from "../useEntryDragMove/constants";
import type { UseNativeDropTargetArgs } from "./types";

// Handles a native OS drag while it's over our window: highlights the folder under the cursor
// and, on drop, hands the dropped paths to `onDropFiles`. This is what lets a drag that left the
// window (see useEntryDragMove's edge handoff) resume its in-app behaviour when it returns —
// @use-gesture can't, because the OS owns the gesture once the native drag starts. It also
// enables dropping files dragged in from other apps.
export const useNativeDropTarget = ({
  entries,
  onDropFiles,
}: UseNativeDropTargetArgs) => {
  const dirPaths = useMemo(
    () => new Set(entries.filter((e) => e.metadata.isDir).map((e) => e.path)),
    [entries],
  );

  // Latest values for the once-registered listener (written in an effect, never during render).
  const dirPathsRef = useRef(dirPaths);
  const onDropFilesRef = useRef(onDropFiles);
  useEffect(() => {
    dirPathsRef.current = dirPaths;
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

  // The folder under a Tauri drag position. Tauri documents this as physical pixels (→ divide by
  // the device pixel ratio for CSS px), but to be robust to how the position arrives we also try
  // it as-is; whichever lands on a row wins.
  const folderAt = (posX: number, posY: number) => {
    const dpr = window.devicePixelRatio || 1;
    return folderAtCss(posX / dpr, posY / dpr) ?? folderAtCss(posX, posY);
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
          const el = folderAt(payload.position.x, payload.position.y);
          clearTarget();
          setActive(false);
          if (el && payload.paths.length)
            onDropFilesRef.current(payload.paths, el.id);
        } else if (payload.type === "leave") {
          clearTarget();
          setActive(false);
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
