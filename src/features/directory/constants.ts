import {
  TAG_COLOR,
  FILE_CATEGORY,
  type FileCategory,
  type FileTypeExtensions,
} from "@/shared/constants";

import { isCategory } from "./formats";

// How often the status-bar OS-stats readout re-polls the system (ms). Slow enough to be cheap,
// fast enough to feel live.
export const SYSTEM_STATS_POLL_MS = 2000;

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

// The extension a newly created markdown file gets. Which extensions *render* as markdown is the
// user's markdown category (see FILE_CATEGORY) — this is only the one we write.
export const MARKDOWN_FORMAT = "md";

// Folder image mosaics are only useful once the grid tile is large enough to read. Below this
// zoom folders keep their regular glyph and, importantly, never inspect their contents.
export const FOLDER_THUMBNAIL_MIN_ZOOM = 1.5;
export const FOLDER_THUMBNAIL_COUNT = 4;

// Whether opening an entry with the given (lowercased) extension launches the in-app preview
// rather than the OS default app, per the user's preview-in-app settings. Single source of truth
// shared by open-routing (Directory.openFile) and by hiding the redundant Preview action when
// Open already previews. Only images/markdown are gated here; pdf/audio/video always open in the
// OS app, so their explicit Preview action stays.
export const opensInAppPreview = (
  ext: string,
  extensions: FileTypeExtensions,
  previewImagesInApp: boolean,
  previewMarkdownInApp: boolean,
): boolean =>
  (previewImagesInApp && isCategory(extensions, ext, FILE_CATEGORY.IMAGE)) ||
  (previewMarkdownInApp && isCategory(extensions, ext, FILE_CATEGORY.MARKDOWN));

// Categories the built-in preview can render. Videos are intentionally excluded: they open in the
// OS's default player instead (the webview struggles with large/long files). Thumbnails still work
// (see DirEntry).
export const PREVIEWABLE_CATEGORIES: readonly FileCategory[] = [
  FILE_CATEGORY.MARKDOWN,
  FILE_CATEGORY.PDF,
  FILE_CATEGORY.IMAGE,
  FILE_CATEGORY.AUDIO,
];

// Whether the built-in preview can open this extension, per the user's category map.
export const isPreviewable = (
  extensions: FileTypeExtensions,
  ext: string,
): boolean => isCategory(extensions, ext, ...PREVIEWABLE_CATEGORIES);
