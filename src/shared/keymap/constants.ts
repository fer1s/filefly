// Named actions that can be bound to a key. Values match the table names in keymap.toml.
export const KEYMAP_ACTION = {
  COPY: "copy",
  CUT: "cut",
  PASTE: "paste",
  TRASH: "trash",
  PREVIEW_PREV: "preview_prev",
  PREVIEW_NEXT: "preview_next",
  PREVIEW_CLOSE: "preview_close",
} as const;

export type KeymapAction = (typeof KEYMAP_ACTION)[keyof typeof KEYMAP_ACTION];

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
