import type { ClipboardMode } from "@/features/directory/constants";

export type Clipboard = { paths: string[]; mode: ClipboardMode } | null;

// A completed transfer: an item that was at `from` and now lives at `to` (real, conflict-resolved
// destination). Undo/redo builders track each item's live location off these pairs.
export type Transfer = { from: string; to: string };

// In-flight batch operation, for the status-bar progress bar. `done` counts completed items
// out of `total` (item-level granularity: one tick per path).
export type OperationProgress = { label: string; done: number; total: number };

export type UseFileOperationsArgs = {
  path: string;
  refreshDir: () => void;
  setSelectedIDs: (ids: string[]) => void;
  // Navigate to `destDir` and select `paths` there once its listing loads (drives the clickable
  // "jump to the moved/copied/restored file" toasts). Pass an empty `paths` to just navigate.
  revealEntries: (destDir: string, paths: string[]) => void;
};
