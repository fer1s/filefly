import { useEffect } from "react";

import { useKeymap, matchesBinding, PINNED_ACTIONS } from "@/shared/keymap";

import type { UsePinnedShortcutsArgs } from "./types";

// Jump to a pinned folder by its slot hotkey (Cmd/Ctrl+1..6). Ignored while typing in inputs.
export const usePinnedShortcuts = ({
  pinned,
  setPath,
}: UsePinnedShortcutsArgs) => {
  const { keymap } = useKeymap();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;

      for (let i = 0; i < pinned.length && i < PINNED_ACTIONS.length; i++) {
        if (matchesBinding(e, keymap[PINNED_ACTIONS[i]])) {
          e.preventDefault();
          setPath(pinned[i].path);
          return;
        }
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [keymap, pinned, setPath]);
};
