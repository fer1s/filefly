import {
  KEYMAP_ACTION,
  TAB_ACTIONS,
  useHotkey,
  useHotkeys,
} from "@/shared/keymap";
import type { HotkeySpec } from "@/shared/keymap";

import { openNewWindow } from "@/shared/services/api";

import { NEXT_TAB_DIRECTION, PREV_TAB_DIRECTION } from "./constants";
import type { UseTabsShortcutsArgs } from "./types";

// Global tab shortcuts: new tab, close active tab, cycle next/previous, and jump to a tab by
// number (Cmd+1..9). These stay active even while typing (Cmd/Ctrl based), matching browsers — so
// every binding opts into `allowInInput`.
export const useTabsShortcuts = ({
  newTab,
  closeActiveTab,
  cycleTab,
  selectTabBySlot,
}: UseTabsShortcutsArgs) => {
  useHotkey(KEYMAP_ACTION.NEW_TAB, newTab, { allowInInput: true });
  useHotkey(KEYMAP_ACTION.NEW_WINDOW, () => void openNewWindow(), {
    allowInInput: true,
  });
  useHotkey(KEYMAP_ACTION.CLOSE_TAB, closeActiveTab, { allowInInput: true });
  useHotkey(KEYMAP_ACTION.NEXT_TAB, () => cycleTab(NEXT_TAB_DIRECTION), {
    allowInInput: true,
  });
  useHotkey(KEYMAP_ACTION.PREV_TAB, () => cycleTab(PREV_TAB_DIRECTION), {
    allowInInput: true,
  });

  // Cmd/Ctrl + 1..9 → jump to that tab slot.
  const slotSpecs: HotkeySpec[] = TAB_ACTIONS.map((action, slot) => ({
    binding: action,
    handler: () => selectTabBySlot(slot),
    allowInInput: true,
  }));
  useHotkeys(slotSpecs);
};
