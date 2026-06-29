import type { OperationProgress } from "../../hooks/useFileOperations";

export type StatusBarProps = {
  total: number;
  selected: number;
  computingSizes: boolean;
  // True while a settings change is being saved to settings.toml.
  savingSettings: boolean;
  // Current copy/move/delete batch, or null when idle.
  progress: OperationProgress | null;
};
