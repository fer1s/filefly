import { useEffect } from "react";

import type { UseClipboardShortcutsArgs } from "./types";

// Clipboard keyboard shortcuts acting on the current selection: Cmd/Ctrl + C/X/V and
// Cmd/Ctrl + Backspace/Delete. Ignored while typing in inputs or when disabled.
export const useClipboardShortcuts = ({
  enabled,
  selectedIDs,
  onCopy,
  onCut,
  onPaste,
  onDelete,
}: UseClipboardShortcutsArgs) => {
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      if (!enabled) return;

      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      switch (e.key) {
        case "c":
          e.preventDefault();
          onCopy(selectedIDs);
          break;
        case "x":
          e.preventDefault();
          onCut(selectedIDs);
          break;
        case "v":
          e.preventDefault();
          onPaste();
          break;
        case "Backspace":
        case "Delete":
          e.preventDefault();
          onDelete(selectedIDs);
          break;
      }
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [enabled, selectedIDs, onCopy, onCut, onPaste, onDelete]);
};
