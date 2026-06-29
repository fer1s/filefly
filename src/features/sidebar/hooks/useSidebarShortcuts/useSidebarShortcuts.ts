import { useEffect } from "react";

import { useKeymap, matchesBinding, KEYMAP_ACTION } from "@/shared/keymap";

import type { UseSidebarShortcutsArgs } from "./types";

// Collapse / expand the sidebar from the keymap (Cmd/Ctrl+B). Ignored while typing in inputs.
export const useSidebarShortcuts = ({ onToggle }: UseSidebarShortcutsArgs) => {
  const { keymap } = useKeymap();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;

      if (matchesBinding(e, keymap[KEYMAP_ACTION.TOGGLE_SIDEBAR])) {
        e.preventDefault();
        onToggle();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [keymap, onToggle]);
};
