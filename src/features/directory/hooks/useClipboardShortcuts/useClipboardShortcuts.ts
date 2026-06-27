import { useEffect } from "react";

import { useKeymap, matchesBinding, KEYMAP_ACTION } from "@/shared/keymap";

import type { UseClipboardShortcutsArgs } from "./types";

// Selection keyboard shortcuts resolved from the keymap (copy/cut/paste/trash/rename).
// Ignored while typing in inputs or when disabled.
export const useClipboardShortcuts = ({
  enabled,
  selectedIDs,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onRename,
  onSelectAll,
}: UseClipboardShortcutsArgs) => {
  const { keymap } = useKeymap();

  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      if (!enabled) return;

      if (matchesBinding(e, keymap[KEYMAP_ACTION.COPY])) {
        e.preventDefault();
        onCopy(selectedIDs);
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.CUT])) {
        e.preventDefault();
        onCut(selectedIDs);
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.PASTE])) {
        e.preventDefault();
        onPaste();
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.TRASH])) {
        e.preventDefault();
        onDelete(selectedIDs);
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.RENAME])) {
        e.preventDefault();
        onRename(selectedIDs);
      } else if (matchesBinding(e, keymap[KEYMAP_ACTION.SELECT_ALL])) {
        // Prevent the browser's native "select all text" so it selects the entries instead.
        e.preventDefault();
        onSelectAll();
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [
    enabled,
    selectedIDs,
    onCopy,
    onCut,
    onPaste,
    onDelete,
    onRename,
    onSelectAll,
    keymap,
  ]);
};
