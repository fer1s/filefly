// One reversible filesystem action on the undo/redo stack. `undo` reverses it, `redo` re-applies
// it; both are async (they run filesystem operations) and recapture live paths so repeated
// undo/redo cycles stay correct even when a conflict-rename changes where an item lands. `label`
// is the human name of what was acted on (e.g. `"file.txt"` or "3 items"), shown in the toast.
export type HistoryEntry = {
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
};
