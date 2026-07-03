import type { OperationProgress } from "../../hooks/useFileOperations";

export type StatusBarProps = {
  total: number;
  selected: number;
  // The active search query (empty when not searching). When set, the status bar shows a
  // "Searching …" indicator on the left — the persistent cue that the view is a filtered result.
  search: string;
  // True while the search query is running (debounced backend walk in flight); shows a spinner
  // busy-indicator alongside the other loading indicators.
  searchLoading: boolean;
  computingSizes: boolean;
  // True while a settings change is being saved to settings.toml.
  savingSettings: boolean;
  // Current copy/move/delete batch, or null when idle.
  progress: OperationProgress | null;
};
