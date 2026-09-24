// Stable identifiers for the generic context-menu actions. Used as keys, never shown to the
// user (labels come from i18n).
export const ENTRY_ACTION = {
  NEW_FOLDER: "new_folder",
  CREATE_FILE: "create_file",
  OPEN: "open",
  OPEN_IN_NEW_TAB: "open_in_new_tab",
  OPEN_CONTAINING_FOLDER: "open_containing_folder",
  OPEN_IN_TERMINAL: "open_in_terminal",
  PREVIEW: "preview",
  COPY: "copy",
  COPY_PATH: "copy_path",
  CUT: "cut",
  PASTE: "paste",
  RENAME: "rename",
  TRASH: "trash",
  RESTORE: "restore",
  DESTROY: "destroy",
  PROPERTIES: "properties",
  COMPRESS: "compress",
  EXTRACT: "extract",
  EXTRACT_TO_FOLDER: "extract_to_folder",
  SORT_BY: "sort_by",
  TOGGLE_HIDDEN: "toggle_hidden",
} as const;

export type EntryActionId = (typeof ENTRY_ACTION)[keyof typeof ENTRY_ACTION];

export const TEXT_FILE_SUBMENU_KEY = "text_file";

// Token in an action list that renders a divider between groups (not a real action).
export const ACTION_SEPARATOR = "separator";
