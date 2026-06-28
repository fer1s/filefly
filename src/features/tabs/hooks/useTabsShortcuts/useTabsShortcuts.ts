import { useEffect } from "react";

import { useKeymap, matchesBinding, KEYMAP_ACTION } from "@/shared/keymap";

import { NEXT_TAB_DIRECTION, PREV_TAB_DIRECTION } from "./constants";
import type { UseTabsShortcutsArgs } from "./types";

// Global tab shortcuts: new tab, close active tab, and cycle to the next/previous tab. These
// stay active even while typing (Cmd/Ctrl based), matching browser behaviour.
export const useTabsShortcuts = ({
  newTab,
  closeActiveTab,
  cycleTab,
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
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [keymap, newTab, closeActiveTab, cycleTab]);
};
