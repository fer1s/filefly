// Named actions that can be bound to a key. Values match the table names in keymap.toml.
export const KEYMAP_ACTION = {
  COPY: "copy",
  CUT: "cut",
  PASTE: "paste",
  TRASH: "trash",
  RENAME: "rename",
  NAV_BACK: "nav_back",
  NAV_FORWARD: "nav_forward",
  NAV_UP: "nav_up",
  TOGGLE_VIEW: "toggle_view",
  PREVIEW_PREV: "preview_prev",
  PREVIEW_NEXT: "preview_next",
  PINNED_1: "pinned_1",
  PINNED_2: "pinned_2",
  PINNED_3: "pinned_3",
  PINNED_4: "pinned_4",
  PINNED_5: "pinned_5",
  PINNED_6: "pinned_6",
} as const;

export type KeymapAction = (typeof KEYMAP_ACTION)[keyof typeof KEYMAP_ACTION];

// Pinned-folder slots in order; index 0 is the first pinned item (Cmd/Ctrl+1). Its length
// also caps how many pinned hotkeys exist. TODO: make the count configurable (see sidebar).
export const PINNED_ACTIONS = [
  KEYMAP_ACTION.PINNED_1,
  KEYMAP_ACTION.PINNED_2,
  KEYMAP_ACTION.PINNED_3,
  KEYMAP_ACTION.PINNED_4,
  KEYMAP_ACTION.PINNED_5,
  KEYMAP_ACTION.PINNED_6,
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
