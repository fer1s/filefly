export const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

export const ENTRY_KIND = {
  FILE: "file",
  DIRECTORY: "dir",
  NONE: "none",
} as const;

export type EntryKind = (typeof ENTRY_KIND)[keyof typeof ENTRY_KIND];

export const CLIPBOARD_MODE = {
  COPY: "copy",
  CUT: "cut",
} as const;

export type ClipboardMode =
  (typeof CLIPBOARD_MODE)[keyof typeof CLIPBOARD_MODE];

export const SORT_KEY = {
  NAME: "name",
  MODIFIED: "modified",
  CREATED: "created",
  SIZE: "size",
  KIND: "kind",
} as const;

export type SortKey = (typeof SORT_KEY)[keyof typeof SORT_KEY];

export const SORT_DIRECTION = {
  ASC: "asc",
  DESC: "desc",
} as const;

export type SortDirection =
  (typeof SORT_DIRECTION)[keyof typeof SORT_DIRECTION];

// Display glyphs for keyboard hints shown in tooltips. Placeholder until the keymapping
// plan lands; replace with the real bindings then.
export const KEY_HINT = {
  ESC: "Esc",
  ARROW_LEFT: "←",
  ARROW_RIGHT: "→",
} as const;

// Marker the Rust `read_directory` command returns when a folder is blocked by OS privacy
// protection (e.g. macOS TCC on ~/.Trash). Matched in the UI to prompt for Full Disk Access.
export const ACCESS_DENIED_ERROR = "ACCESS_DENIED";

export const MARKDOWN_FORMAT = "md";
export const IMAGE_FORMATS: readonly string[] = ["png", "jpg", "jpeg", "webp"];
export const AUDIO_FORMATS: readonly string[] = ["mp3", "wav", "ogg"];

export const ACCEPTED_PREVIEW_FORMATS: readonly string[] = [
  MARKDOWN_FORMAT,
  ...IMAGE_FORMATS,
  ...AUDIO_FORMATS,
];
