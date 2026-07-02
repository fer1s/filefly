import { KEYMAP_ACTION, useHotkey } from "@/shared/keymap";

import type { UseClipboardShortcutsArgs } from "./types";

// Selection keyboard shortcuts resolved from the keymap (copy/cut/paste/trash/rename/…). Ignored
// while typing in inputs (centralized in the dispatcher) or when disabled (e.g. a preview/
// properties popup is open).
export const useClipboardShortcuts = ({
  enabled,
  selectedIDs,
  onCopy,
  onCut,
  onPaste,
  onUndo,
  onRedo,
  onDelete,
  onDeletePermanently,
  onRename,
  onNewFolder,
  onSelectAll,
  onOpenInTerminal,
  onProperties,
}: UseClipboardShortcutsArgs) => {
  // Always swallow select-all so the webview's native "select everything" never fires (it would
  // highlight the whole page / image Live Text). Only select entries when active.
  useHotkey(KEYMAP_ACTION.SELECT_ALL, () => {
    if (enabled) onSelectAll();
  });

  useHotkey(KEYMAP_ACTION.COPY, () => onCopy(selectedIDs), { when: enabled });
  useHotkey(KEYMAP_ACTION.CUT, () => onCut(selectedIDs), { when: enabled });
  useHotkey(KEYMAP_ACTION.PASTE, () => onPaste(), { when: enabled });
  useHotkey(KEYMAP_ACTION.UNDO, () => onUndo(), { when: enabled });
  useHotkey(KEYMAP_ACTION.REDO, () => onRedo(), { when: enabled });
  useHotkey(
    KEYMAP_ACTION.DELETE_PERMANENTLY,
    () => onDeletePermanently(selectedIDs),
    { when: enabled },
  );
  useHotkey(KEYMAP_ACTION.TRASH, () => onDelete(selectedIDs), {
    when: enabled,
  });
  useHotkey(KEYMAP_ACTION.RENAME, () => onRename(selectedIDs), {
    when: enabled,
  });
  useHotkey(KEYMAP_ACTION.NEW_FOLDER, onNewFolder, { when: enabled });
  useHotkey(KEYMAP_ACTION.OPEN_IN_TERMINAL, onOpenInTerminal, {
    when: enabled,
  });
  useHotkey(KEYMAP_ACTION.PROPERTIES, onProperties, { when: enabled });
};
