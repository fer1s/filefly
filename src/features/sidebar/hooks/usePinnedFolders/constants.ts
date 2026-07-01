// System Trash directory name, relative to the user's home directory (macOS/Linux).
export const TRASH_DIR_NAME = ".Trash";

// Maximum number of pinned folders shown in the sidebar. Matches the count of pinned hotkey
// slots (Cmd/Ctrl+1..6). TODO: let the user configure this (and add matching hotkey slots).
export const MAX_PINNED_FOLDERS = 6;

// Stable id per built-in preset pin, independent of its resolved path (which differs per machine).
// Persisted in sidebar.toml (hiddenPresets) so a hidden preset stays hidden across launches.
export const PRESET_ID = {
  HOME: "home",
  DESKTOP: "desktop",
  DOCUMENTS: "documents",
  DOWNLOADS: "downloads",
  PICTURES: "pictures",
  TRASH: "trash",
} as const;
