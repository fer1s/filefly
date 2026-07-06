import { KEY } from "@/shared/constants";
import { KEYMAP_ACTION, useHotkey } from "@/shared/keymap";

import type { UsePathBarShortcutsArgs } from "./types";

// PathBar command shortcuts resolved from the keymap: history navigation (back/forward/up/home),
// the list/grid view toggle, show-hidden, info panel, and search. Ignored while typing in inputs.
export const usePathBarShortcuts = ({
  goBack,
  goForward,
  goUp,
  goHome,
  toggleView,
  toggleHidden,
  toggleInfo,
  toggleSearch,
  closeSearch,
  searchActive,
}: UsePathBarShortcutsArgs) => {
  useHotkey(KEYMAP_ACTION.NAV_BACK, goBack);
  useHotkey(KEYMAP_ACTION.NAV_FORWARD, goForward);
  useHotkey(KEYMAP_ACTION.NAV_UP, goUp);
  useHotkey(KEYMAP_ACTION.GO_HOME, goHome);
  useHotkey(KEYMAP_ACTION.TOGGLE_VIEW, toggleView);
  useHotkey(KEYMAP_ACTION.TOGGLE_HIDDEN, toggleHidden);
  useHotkey(KEYMAP_ACTION.TOGGLE_INFO, toggleInfo);
  useHotkey(KEYMAP_ACTION.SEARCH, toggleSearch);
  // Escape closes the search field whether or not the input is focused (allowInInput), so it works
  // both while typing and while browsing the results.
  useHotkey({ keys: [KEY.ESCAPE] }, closeSearch, {
    when: searchActive,
    allowInInput: true,
  });
};
