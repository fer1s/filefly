import { TAG_COLOR } from "@/shared/constants";

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

// The seven selectable colours shown in the context-menu picker, in Finder's left→right order.
// `class` is the CSS modifier / i18n key; `index` is the stored colour byte (see shared TAG_COLOR).
export const TAG_PICKER_COLORS = [
  { index: TAG_COLOR.RED, class: "red" },
  { index: TAG_COLOR.ORANGE, class: "orange" },
  { index: TAG_COLOR.YELLOW, class: "yellow" },
  { index: TAG_COLOR.GREEN, class: "green" },
  { index: TAG_COLOR.BLUE, class: "blue" },
  { index: TAG_COLOR.PURPLE, class: "purple" },
  { index: TAG_COLOR.GRAY, class: "gray" },
] as const;

export const MARKDOWN_FORMAT = "md";
export const MARKDOWN_FORMATS: readonly string[] = ["md", "markdown"];
export const PDF_FORMAT = "pdf";
// SVG renders natively in the webview's <img>, so it skips the Rust thumbnail pipeline (the
// `image` crate can't rasterise SVG) and is drawn straight from the file — see useEntryThumbnail.
export const SVG_FORMAT = "svg";
export const IMAGE_FORMATS: readonly string[] = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  SVG_FORMAT,
];
export const AUDIO_FORMATS: readonly string[] = ["mp3", "wav", "ogg"];
export const VIDEO_FORMATS: readonly string[] = [
  "mp4",
  "webm",
  "mov",
  "m4v",
  "ogv",
];

// Format groups used only to pick a file-type glyph (see fileIcon registry). They are
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
