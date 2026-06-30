import { KEYMAP_ACTION, useHotkey } from "@/shared/keymap";

// Opens settings on the VS Code-style shortcut (Cmd/Ctrl + ,), app-wide.
export const useSettingsShortcut = (onOpen: () => void) => {
  useHotkey(KEYMAP_ACTION.OPEN_SETTINGS, onOpen);
};
