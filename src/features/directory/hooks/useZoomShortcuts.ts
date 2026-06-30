import { KEYMAP_ACTION, useHotkey } from "@/shared/keymap";

import { useStateContext } from "@/shared/providers/StateProvider";

// Keyboard zoom shortcuts (Cmd/Ctrl + / -) resolved from the keymap. Ignored while typing in
// inputs or when disabled (e.g. a preview/properties popup is open). The dispatcher's
// preventDefault stops the webview's own zoom from also firing.
export const useZoomShortcuts = (enabled: boolean) => {
  const { zoomIn, zoomOut } = useStateContext();
  useHotkey(KEYMAP_ACTION.ZOOM_IN, zoomIn, { when: enabled });
  useHotkey(KEYMAP_ACTION.ZOOM_OUT, zoomOut, { when: enabled });
};
