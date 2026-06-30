export const VIEW_MODE = {
  GRID: "grid",
  LIST: "list",
} as const;

// Sentinel "path" for the Finder-style Recents view. Not a real directory — the directory loader
// special-cases it to fetch recent files instead of reading a folder.
export const RECENTS = "recents://";

// Sentinel "path" prefix for a Finder tag view (e.g. "tags://Red"). Like RECENTS, not a real
// directory — the loader fetches the tagged files instead. See tagsPath / tagFromPath / isTagsPath.
export const TAGS_PREFIX = "tags://";

// Finder tag colour indices — the byte stored after the tag name in the xattr (`Name\nIndex`).
// 0 = no colour; 1..=7 are the standard Finder colours. Shared by the directory (dots, picker)
// and the sidebar (tag filter), so it lives here rather than in one feature.
export const TAG_COLOR = {
  NONE: 0,
  GRAY: 1,
  GREEN: 2,
  PURPLE: 3,
  BLUE: 4,
  YELLOW: 5,
  RED: 6,
  ORANGE: 7,
} as const;

export type TagColor = (typeof TAG_COLOR)[keyof typeof TAG_COLOR];

// CSS modifier class per colour index (array position = the index), driving the --color-tag-*
// styling. Index 0 is the uncoloured (hollow) dot.
export const TAG_COLOR_CLASS = [
  "none",
  "gray",
  "green",
  "purple",
  "blue",
  "yellow",
  "red",
  "orange",
] as const;

// The seven selectable colours shown in the context-menu picker and the sidebar, in Finder's
// left→right order. `class` is the CSS modifier / i18n key; `index` is the stored colour byte.
export const TAG_PICKER_COLORS = [
  { index: TAG_COLOR.RED, class: "red" },
  { index: TAG_COLOR.ORANGE, class: "orange" },
  { index: TAG_COLOR.YELLOW, class: "yellow" },
  { index: TAG_COLOR.GREEN, class: "green" },
  { index: TAG_COLOR.BLUE, class: "blue" },
  { index: TAG_COLOR.PURPLE, class: "purple" },
  { index: TAG_COLOR.GRAY, class: "gray" },
] as const;

// System Trash directory name (relative to home on macOS/Linux). Used to detect when the user is
// browsing the Trash so the entry menu offers Restore instead of Move-to-Trash.
export const TRASH_DIR_NAME = ".Trash";

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
export const MARKDOWN_FORMATS: readonly string[] = ["md", "markdown"];
export const PDF_FORMAT = "pdf";
export const IMAGE_FORMATS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
];
export const AUDIO_FORMATS: readonly string[] = ["mp3", "wav", "ogg"];
export const VIDEO_FORMATS: readonly string[] = [
  "mp4",
  "webm",
  "mov",
  "m4v",
  "ogv",
];

// Format groups used only to pick a file-type glyph (see directory fileIcon registry). They are
// not previewable — purely cosmetic icon hints — so they live apart from ACCEPTED_PREVIEW_FORMATS.
export const ARCHIVE_FORMATS: readonly string[] = [
  "zip",
  "rar",
  "7z",
  "tar",
  "gz",
  "bz2",
  "xz",
];
export const WORD_FORMATS: readonly string[] = ["doc", "docx", "odt"];
export const SPREADSHEET_FORMATS: readonly string[] = ["xls", "xlsx", "ods"];
export const CSV_FORMATS: readonly string[] = ["csv", "tsv"];
export const PRESENTATION_FORMATS: readonly string[] = ["ppt", "pptx", "odp"];
export const TEXT_FORMATS: readonly string[] = ["txt", "log", "rtf"];
export const CODE_FORMATS: readonly string[] = [
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "html",
  "css",
  "scss",
  "rs",
  "py",
  "go",
  "java",
  "c",
  "cpp",
  "h",
  "sh",
  "yml",
  "yaml",
  "toml",
  "xml",
];

// Videos are intentionally excluded: they open in the OS's default player instead of the in-app
// preview (the webview struggles with large/long files). Thumbnails still work (see DirEntry).
export const ACCEPTED_PREVIEW_FORMATS: readonly string[] = [
  MARKDOWN_FORMAT,
  PDF_FORMAT,
  ...IMAGE_FORMATS,
  ...AUDIO_FORMATS,
];
