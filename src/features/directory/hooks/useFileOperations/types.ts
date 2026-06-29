import type { ClipboardMode } from "@/shared/constants";

export type Clipboard = { paths: string[]; mode: ClipboardMode } | null;

// In-flight batch operation, for the status-bar progress bar. `done` counts completed items
// out of `total` (item-level granularity: one tick per path).
export type OperationProgress = { label: string; done: number; total: number };

export type UseFileOperationsArgs = {
  path: string;
  refreshDir: () => void;
  setSelectedIDs: (ids: string[]) => void;
};
