// Named actions that can be bound to a key. Values match the table names in keymap.toml.
export const KEYMAP_ACTION = {
  COPY: "copy",
  CUT: "cut",
  PASTE: "paste",
  TRASH: "trash",
  DELETE_PERMANENTLY: "delete_permanently",
  SELECT_ALL: "select_all",
  RENAME: "rename",
  NEW_FOLDER: "new_folder",
  NAV_BACK: "nav_back",
  NAV_FORWARD: "nav_forward",
  NAV_UP: "nav_up",
  TOGGLE_VIEW: "toggle_view",
  TOGGLE_HIDDEN: "toggle_hidden",
  ZOOM_IN: "zoom_in",
  ZOOM_OUT: "zoom_out",
  PREVIEW_PREV: "preview_prev",
  PREVIEW_NEXT: "preview_next",
  NEW_TAB: "new_tab",
  CLOSE_TAB: "close_tab",
  NEXT_TAB: "next_tab",
  PREV_TAB: "prev_tab",
  OPEN_SETTINGS: "open_settings",
  OPEN_IN_TERMINAL: "open_in_terminal",
  PROPERTIES: "properties",
  TOGGLE_SIDEBAR: "toggle_sidebar",
  GO_HOME: "go_home",
  TOGGLE_INFO: "toggle_info",
  HELP_SHORTCUTS: "help_shortcuts",
  PINNED_1: "pinned_1",
  PINNED_2: "pinned_2",
  PINNED_3: "pinned_3",
  PINNED_4: "pinned_4",
  PINNED_5: "pinned_5",
  PINNED_6: "pinned_6",
  TAB_1: "tab_1",
  TAB_2: "tab_2",
  TAB_3: "tab_3",
  TAB_4: "tab_4",
  TAB_5: "tab_5",
  TAB_6: "tab_6",
  TAB_7: "tab_7",
  TAB_8: "tab_8",
  TAB_9: "tab_9",
} as const;

export type KeymapAction = (typeof KEYMAP_ACTION)[keyof typeof KEYMAP_ACTION];

// Pinned-folder slots in order; index 0 is the first pinned item (Opt/Alt+1). Its length
// also caps how many pinned hotkeys exist.
export const PINNED_ACTIONS = [
  KEYMAP_ACTION.PINNED_1,
  KEYMAP_ACTION.PINNED_2,
  KEYMAP_ACTION.PINNED_3,
  KEYMAP_ACTION.PINNED_4,
  KEYMAP_ACTION.PINNED_5,
  KEYMAP_ACTION.PINNED_6,
] as const;

// Tab slots in order; index 0 = first tab (Cmd/Ctrl+1). Selecting a slot with no tab is a no-op.
export const TAB_ACTIONS = [
  KEYMAP_ACTION.TAB_1,
  KEYMAP_ACTION.TAB_2,
  KEYMAP_ACTION.TAB_3,
  KEYMAP_ACTION.TAB_4,
  KEYMAP_ACTION.TAB_5,
  KEYMAP_ACTION.TAB_6,
  KEYMAP_ACTION.TAB_7,
  KEYMAP_ACTION.TAB_8,
  KEYMAP_ACTION.TAB_9,
] as const;

// Pretty glyphs for common keys when rendering a binding (keyed by lowercased KeyboardEvent.key).
export const KEY_GLYPH: Record<string, string> = {
  arrowleft: "←",
  arrowright: "→",
  arrowup: "↑",
  arrowdown: "↓",
  escape: "Esc",
  enter: "↵",
  backspace: "⌫",
  delete: "Del",
  " ": "Space",
};
