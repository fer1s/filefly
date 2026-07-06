// A drag-drop of entries onto a folder awaiting confirmation (null when no dialog is pending).
// `copy` picks move vs copy per the drag-and-drop settings.
export type PendingDrop = { sources: string[]; dest: string; copy: boolean };
