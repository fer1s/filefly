import { KEYMAP_ACTION, useHotkey } from "@/shared/keymap";

import type { UseSidebarShortcutsArgs } from "./types";

// Collapse / expand the sidebar from the keymap (Cmd/Ctrl+B). Ignored while typing in inputs.
export const useSidebarShortcuts = ({ onToggle }: UseSidebarShortcutsArgs) => {
  useHotkey(KEYMAP_ACTION.TOGGLE_SIDEBAR, onToggle);
};
