import { useEffect } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { useKeymap, matchesBinding, KEYMAP_ACTION } from "@/shared/keymap";

// Keyboard zoom shortcuts (Cmd/Ctrl + / -) resolved from the keymap. Ignored while typing in
// inputs or when disabled. preventDefault stops the webview's own zoom from also firing.
export const useZoomShortcuts = (enabled: boolean) => {
  const { zoomIn, zoomOut } = useStateContext();
  const { keymap } = useKeymap();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      if (!enabled) return;

      if (matchesBinding(e, keymap[KEYMAP_ACTION.ZOOM_IN])) {
        e.preventDefault();
        zoomIn();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.ZOOM_OUT])) {
        e.preventDefault();
        zoomOut();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [enabled, keymap, zoomIn, zoomOut]);
};
