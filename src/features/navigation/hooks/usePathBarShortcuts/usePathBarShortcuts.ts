import { useEffect } from "react";

import { useKeymap, matchesBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { KEY } from "@/shared/constants";

import type { UsePathBarShortcutsArgs } from "./types";

// PathBar command shortcuts resolved from the keymap: history navigation (back/forward/up)
// and the list/grid view toggle. Ignored while typing in inputs.
export const usePathBarShortcuts = ({
  goBack,
  goForward,
  goUp,
  toggleView,
  toggleHidden,
}: UsePathBarShortcutsArgs) => {
  const { keymap } = useKeymap();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;

      // Plain Backspace goes back in history (and we preventDefault so the webview doesn't do
      // its own "navigate back", which flashed the Volumes view).
      if (e.key === KEY.BACKSPACE && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        goBack();
        return;
      }

      if (matchesBinding(e, keymap[KEYMAP_ACTION.NAV_BACK])) {
        e.preventDefault();
        goBack();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.NAV_FORWARD])) {
        e.preventDefault();
        goForward();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.NAV_UP])) {
        e.preventDefault();
        goUp();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.TOGGLE_VIEW])) {
        e.preventDefault();
        toggleView();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.TOGGLE_HIDDEN])) {
        e.preventDefault();
        toggleHidden();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [keymap, goBack, goForward, goUp, toggleView, toggleHidden]);
};
