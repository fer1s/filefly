export const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
} as const;

// Sentinel "path" for the Finder-style Recents view. Not a real directory — the directory loader
// special-cases it to fetch recent files instead of reading a folder.
export const RECENTS = "recents://";

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

// Directory zoom: a CSS `zoom` multiplier applied to the entries area. 1 = 100%.
export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;
export const ZOOM_DEFAULT = 1;

// User-adjustable sidebar background opacity (alpha of --color-background-sidebar). 0 = fully
// transparent (the window/material shows through), 1 = opaque.
export const SIDEBAR_OPACITY_MIN = 0;
export const SIDEBAR_OPACITY_MAX = 1;
export const SIDEBAR_OPACITY_STEP = 0.05;
export const DEFAULT_SIDEBAR_OPACITY = 0.85;

// Sentinel date-format value meaning "use the OS locale's date-time string" (Date.toLocaleString).
// Any other value is a token pattern (YYYY, MM, DD, HH, …) interpreted by formatDate.
export const DATE_FORMAT_LOCALE = "locale";

// Default date format before the user picks one: the system locale (preserves prior behavior).
export const DEFAULT_DATE_FORMAT = DATE_FORMAT_LOCALE;

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

// DOM KeyboardEvent.key names used in non-configurable key handling (navigation, input
// submit/cancel). These are not user-rebindable bindings — see shared/keymap for those — but
// they still shouldn't be raw string literals scattered through the code.
export const KEY = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  BACKSPACE: "Backspace",
  SPACE: " ",
  TAB: "Tab",
  ARROW_UP: "ArrowUp",
  ARROW_DOWN: "ArrowDown",
  ARROW_LEFT: "ArrowLeft",
  ARROW_RIGHT: "ArrowRight",
  HOME: "Home",
  END: "End",
} as const;

// Marker the Rust `read_directory` command returns when a folder is blocked by OS privacy
// protection (e.g. macOS TCC on ~/.Trash). Matched in the UI to prompt for Full Disk Access.
export const ACCESS_DENIED_ERROR = "ACCESS_DENIED";

// Semantic UI colors for elements that support a color variant (e.g. menu items, buttons).
// Values double as CSS modifier class names.
export const UI_COLOR = {
  DEFAULT: "default",
  DANGER: "danger",
} as const;

export type UiColor = (typeof UI_COLOR)[keyof typeof UI_COLOR];

export const MARKDOWN_FORMAT = "md";
export const PDF_FORMAT = "pdf";
export const IMAGE_FORMATS: readonly string[] = ["png", "jpg", "jpeg", "webp"];
export const AUDIO_FORMATS: readonly string[] = ["mp3", "wav", "ogg"];
export const VIDEO_FORMATS: readonly string[] = [
  "mp4",
  "webm",
  "mov",
  "m4v",
  "ogv",
];

export const ACCEPTED_PREVIEW_FORMATS: readonly string[] = [
  MARKDOWN_FORMAT,
  PDF_FORMAT,
  ...IMAGE_FORMATS,
  ...AUDIO_FORMATS,
  ...VIDEO_FORMATS,
];
