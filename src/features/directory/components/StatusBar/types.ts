import type { OperationProgress } from "../../hooks/useFileOperations";

export type StatusBarProps = {
  total: number;
  selected: number;
  computingSizes: boolean;
  // Current copy/move/delete batch, or null when idle.
  progress: OperationProgress | null;
};
