// localStorage key for the persisted tab session (open tabs + which one is active).
export const TABS_STORAGE_KEY = "tabs";
export const ACTIVE_TAB_STORAGE_KEY = "activeTabId";
// localStorage mirror of the launch preference (startup mode + home path). settings.toml is the
// source of truth, but tab restoration runs synchronously at mount — before the async toml load
// resolves — so the last-known value is cached here for the next launch's init to read.
export const STARTUP_STORAGE_KEY = "startup";

// Pointer distance (px) a tab must travel before a drag-reorder starts. Below this a press is a
// plain click (select) — so a slightly jittery click doesn't lift the tab into a drag.
export const TAB_DRAG_THRESHOLD_PX = 6;
