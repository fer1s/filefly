import type { CleanupMode } from "@/shared/constants";
import type { CleanupTarget } from "@/shared/services/api";

// What useCleanupTargets exposes to the panel. The hook owns every side effect (IPC, folder picker,
// confirmation, toasts) so the row/panel components stay presentational.
export type CleanupTargetsState = {
  // null while the first size walk is still running (the panel shows a measuring hint).
  targets: CleanupTarget[] | null;
  // Summed size of every registered target, for the panel total and the per-row share bars.
  total: number;
  // Path currently being cleaned, or the ADD_SENTINEL while a folder is being registered. Used to
  // disable that row's actions and show it as busy; only one operation runs at a time.
  busyPath: string | null;
  // Re-measure every target (sizes change as tools rebuild their caches).
  refresh: () => Promise<void>;
  // Register the typed path (`~` allowed; the backend expands and validates it). Resolves true when
  // it was registered — the caller clears its input — and false when rejected.
  add: (path: string) => Promise<boolean>;
  // Unregister a target (nothing on disk is touched).
  remove: (path: string) => Promise<void>;
  // Switch what a cleanup removes for one target.
  setMode: (path: string, mode: CleanupMode) => Promise<void>;
  // Confirm, then move the target (or its children) to the Trash and re-measure.
  clean: (target: CleanupTarget) => Promise<void>;
};

// Props for one watched-folder chip.
export type CleanupChipProps = {
  target: CleanupTarget;
  // True while this chip's own cleanup is running (its broom becomes a spinner).
  busy: boolean;
  // True while any operation is running — sibling chips disable their actions too, so a second
  // cleanup can't start against a stale size.
  locked: boolean;
  onOpen: (path: string) => void;
  // Flip between emptying the folder's contents and trashing the folder itself.
  onModeToggle: () => void;
  onClean: () => void;
  onRemove: () => void;
};
