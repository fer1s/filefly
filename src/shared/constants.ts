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

export const MARKDOWN_FORMAT = "md";
export const IMAGE_FORMATS: readonly string[] = ["png", "jpg", "jpeg", "webp"];
export const AUDIO_FORMATS: readonly string[] = ["mp3", "wav", "ogg"];

export const ACCEPTED_PREVIEW_FORMATS: readonly string[] = [
  MARKDOWN_FORMAT,
  ...IMAGE_FORMATS,
  ...AUDIO_FORMATS,
];
