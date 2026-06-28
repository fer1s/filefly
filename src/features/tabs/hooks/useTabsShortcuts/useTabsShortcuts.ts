import { useEffect } from "react";

import {
  useKeymap,
  matchesBinding,
  KEYMAP_ACTION,
  TAB_ACTIONS,
} from "@/shared/keymap";

import { NEXT_TAB_DIRECTION, PREV_TAB_DIRECTION } from "./constants";
import type { UseTabsShortcutsArgs } from "./types";

// Global tab shortcuts: new tab, close active tab, cycle next/previous, and jump to a tab by
// number (Cmd+1..9). These stay active even while typing (Cmd/Ctrl based), matching browsers.
export const useTabsShortcuts = ({
  newTab,
  closeActiveTab,
  cycleTab,
  selectTabBySlot,
}: UseTabsShortcutsArgs) => {
  const { keymap } = useKeymap();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (matchesBinding(e, keymap[KEYMAP_ACTION.NEW_TAB])) {
        e.preventDefault();
        newTab();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.CLOSE_TAB])) {
        e.preventDefault();
        closeActiveTab();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.NEXT_TAB])) {
        e.preventDefault();
        cycleTab(NEXT_TAB_DIRECTION);
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.PREV_TAB])) {
        e.preventDefault();
        cycleTab(PREV_TAB_DIRECTION);
        return;
      }

      // Cmd/Ctrl + 1..9 → jump to that tab slot.
      const slot = TAB_ACTIONS.findIndex((action) =>
        matchesBinding(e, keymap[action]),
      );
      if (slot !== -1) {
        e.preventDefault();
        selectTabBySlot(slot);
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [keymap, newTab, closeActiveTab, cycleTab, selectTabBySlot]);
};
