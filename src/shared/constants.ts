import { isMacPlatform } from "@/shared/keymap/utils";

import type { AppSettings } from "@/shared/services/api";

// Recommended folder-size exclusions on macOS: OS-generated junk (Finder metadata, AppleDouble
// forks, Spotlight/Trash/Versions/FSEvents stores, WidgetKit timeline caches, localization
// markers, Windows-share droppings) that never holds user content and only inflates size totals. Seeded as the default so new users get sensible exclusions out of the box. Mirrors
// default_size_ignores() in functions/settings.rs (must stay in sync). Empty on other platforms.
export const MACOS_SIZE_IGNORES = [
  ".DS_Store",
  "._*",
  ".Spotlight-V100",
  ".Trashes",
  ".DocumentRevisions-V100",
  ".apdisk",
  ".fseventsd",
  "com.apple.chrono",
  ".localized",
  ".AppleDouble",
  "Thumbs.db",
  "desktop.ini",
];

// The file-type categories an extension can belong to. A category decides everything the app does
// by file type: which glyph an entry shows, whether it can be thumbnailed, and whether the built-in
// preview can open it. Users map extra extensions onto these in Settings (they pick the category,
// never the glyph), so the set itself is closed.
export const FILE_CATEGORY = {
  ARCHIVE: "archive",
  AUDIO: "audio",
  VIDEO: "video",
  IMAGE: "image",
  PDF: "pdf",
  WORD: "word",
  SPREADSHEET: "spreadsheet",
  CSV: "csv",
  PRESENTATION: "presentation",
  CODE: "code",
  TEXT: "text",
  MARKDOWN: "markdown",
} as const;

export type FileCategory = (typeof FILE_CATEGORY)[keyof typeof FILE_CATEGORY];

// One palette for category badges in Settings and optional coloured explorer file glyphs.
export const FILE_CATEGORY_COLORS: Record<FileCategory, string> = {
  [FILE_CATEGORY.ARCHIVE]: "var(--color-tag-gray)",
  [FILE_CATEGORY.AUDIO]: "var(--color-tag-purple)",
  [FILE_CATEGORY.VIDEO]: "var(--color-tag-red)",
  [FILE_CATEGORY.IMAGE]: "var(--color-tag-green)",
  [FILE_CATEGORY.PDF]: "var(--color-tag-red)",
  [FILE_CATEGORY.WORD]: "var(--color-tag-blue)",
  [FILE_CATEGORY.SPREADSHEET]: "var(--color-tag-green)",
  [FILE_CATEGORY.CSV]: "var(--color-tag-green)",
  [FILE_CATEGORY.PRESENTATION]: "var(--color-tag-orange)",
  [FILE_CATEGORY.CODE]: "var(--color-tag-orange)",
  [FILE_CATEGORY.TEXT]: "var(--color-tag-gray)",
  [FILE_CATEGORY.MARKDOWN]: "var(--color-tag-blue)",
};

// Resolution order: the first category whose extensions contain the one looked up wins. An
// extension can only live in one category (the settings editor rejects duplicates), so this is
// only a tie-break for a hand-edited settings.toml. Also the order the Settings editor lists them.
export const FILE_CATEGORY_ORDER: readonly FileCategory[] = [
  FILE_CATEGORY.ARCHIVE,
  FILE_CATEGORY.AUDIO,
  FILE_CATEGORY.VIDEO,
  FILE_CATEGORY.IMAGE,
  FILE_CATEGORY.PDF,
  FILE_CATEGORY.WORD,
  FILE_CATEGORY.SPREADSHEET,
  FILE_CATEGORY.CSV,
  FILE_CATEGORY.PRESENTATION,
  FILE_CATEGORY.CODE,
  FILE_CATEGORY.TEXT,
  FILE_CATEGORY.MARKDOWN,
];

// Extension → category map as stored in settings (lowercase, no leading dot).
export type FileTypeExtensions = Record<FileCategory, string[]>;

// SVG renders natively in the webview's <img>, so it skips the Rust thumbnail pipeline (the
// `image` crate can't rasterise SVG) and is drawn straight from the file — see useEntryThumbnail.
export const SVG_FORMAT = "svg";

// The categories seeded into settings.toml on first run and restored by "reset to default".
// Mirrors default_file_type_extensions() in functions/settings.rs (must stay in sync).
export const DEFAULT_FILE_TYPE_EXTENSIONS: FileTypeExtensions = {
  [FILE_CATEGORY.ARCHIVE]: ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"],
  [FILE_CATEGORY.AUDIO]: ["mp3", "wav", "ogg"],
  [FILE_CATEGORY.VIDEO]: ["mp4", "webm", "mov", "m4v", "ogv"],
  [FILE_CATEGORY.IMAGE]: ["png", "jpg", "jpeg", "webp", "gif", SVG_FORMAT],
  [FILE_CATEGORY.PDF]: ["pdf"],
  [FILE_CATEGORY.WORD]: ["doc", "docx", "odt", "pages"],
  [FILE_CATEGORY.SPREADSHEET]: ["xls", "xlsx", "ods"],
  [FILE_CATEGORY.CSV]: ["csv", "tsv"],
  [FILE_CATEGORY.PRESENTATION]: ["ppt", "pptx", "odp"],
  [FILE_CATEGORY.CODE]: [
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
  ],
  [FILE_CATEGORY.TEXT]: ["txt", "log", "rtf"],
  [FILE_CATEGORY.MARKDOWN]: ["md", "markdown"],
};

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

// System Trash directory name (relative to home on macOS/Linux). Used to detect when the user is
// browsing the Trash so the entry menu offers Restore instead of Move-to-Trash.
export const TRASH_DIR_NAME = ".Trash";

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

// Directory zoom: a CSS `zoom` multiplier applied to the entries area. 1 = 100%.
export const ZOOM_MIN = 0.75;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 0.25;
export const ZOOM_DEFAULT = 1;

// Grid icon size: a multiplier on the grid tile (and its icon), independent of the per-folder
// zoom — the Finder "Icon size" slider (View Options). 1 = the default 76px tile.
export const GRID_ICON_SIZE_MIN = 0.5;
export const GRID_ICON_SIZE_MAX = 4;
export const GRID_ICON_SIZE_STEP = 0.05;
export const DEFAULT_GRID_ICON_SIZE = 1;

// User-adjustable sidebar background opacity (alpha of --color-background-sidebar). 0 = fully
// transparent (the window/material shows through), 1 = opaque.
export const SIDEBAR_OPACITY_MIN = 0;
export const SIDEBAR_OPACITY_MAX = 1;
export const SIDEBAR_OPACITY_STEP = 0.05;
export const DEFAULT_SIDEBAR_OPACITY = 0.85;

// User-adjustable context-menu background opacity (alpha of the popover surface). Same 0..1 range
// and step as the sidebar; 0 = fully transparent (only the blur shows), 1 = opaque.
export const DEFAULT_CONTEXT_MENU_OPACITY = 0.5;

// User-adjustable opacity of the preview floating-controls pill (alpha of the popover surface).
// Same 0..1 range and step as the sidebar; 0 = fully transparent (only the blur shows).
export const DEFAULT_PREVIEW_CONTROLS_OPACITY = 0.5;

// User-adjustable dialog (modal) background opacity — Preview, Confirmation, Properties, Settings,
// etc. Same 0..1 range and step as the sidebar; 0 = fully transparent (only the blur shows).
export const DEFAULT_DIALOG_OPACITY = 0.85;

// User-adjustable sidebar width (px), the expanded grid column. Dragging the right edge clamps
// between MIN and MAX; the collapsed rail keeps its own fixed width. DEFAULT matches the
// --size-sidebar-expanded token (theme.css) so first launch looks unchanged.
export const SIDEBAR_WIDTH_MIN = 180;
export const SIDEBAR_WIDTH_MAX = 400;
export const DEFAULT_SIDEBAR_WIDTH = 220;

// Sentinel date-format value meaning "use the OS locale's date-time string" (Date.toLocaleString).
// Any other value is a token pattern (YYYY, MM, DD, HH, …) interpreted by formatDate.
export const DATE_FORMAT_LOCALE = "locale";

// Default date format before the user picks one: the system locale (preserves prior behavior).
export const DEFAULT_DATE_FORMAT = DATE_FORMAT_LOCALE;

// What the app opens on launch. RESTORE reopens the previous tab session; VOLUMES starts a
// fresh session at the Volumes view; HOME starts a fresh session at a user-picked folder.
export const STARTUP_MODE = {
  RESTORE: "restore",
  VOLUMES: "volumes",
  HOME: "home",
} as const;

export type StartupMode = (typeof STARTUP_MODE)[keyof typeof STARTUP_MODE];

// Default before the user picks: restore the previous session (preserves prior behavior).
export const DEFAULT_STARTUP_MODE: StartupMode = STARTUP_MODE.RESTORE;

// App colour theme. SYSTEM follows the OS light/dark preference; LIGHT/DARK force one.
export const THEME = {
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
} as const;

export type Theme = (typeof THEME)[keyof typeof THEME];

// Default: follow the system appearance.
export const DEFAULT_THEME: Theme = THEME.SYSTEM;

// Accent colour — the single hue that drives selection wells, focus rings, and links. Neutral
// surfaces/text stay black/white; the accent is the one "alive" colour on top. Values double as
// the data-accent attribute on <html> and select the matching palette in theme.css (keep in sync).
export const ACCENT = {
  BLUE: "blue",
  NAVY: "navy",
  RED: "red",
  TEAL: "teal",
  GOLD: "gold",
} as const;

export type Accent = (typeof ACCENT)[keyof typeof ACCENT];

// Ordered for the settings swatch row. `rgb` mirrors --color-accent-rgb in theme.css so the
// preview swatches match the live tokens without re-reading CSS.
export const ACCENTS: readonly { value: Accent; rgb: string }[] = [
  { value: ACCENT.BLUE, rgb: "94, 154, 255" },
  { value: ACCENT.NAVY, rgb: "42, 94, 168" },
  { value: ACCENT.RED, rgb: "224, 74, 80" },
  { value: ACCENT.TEAL, rgb: "20, 160, 135" },
  { value: ACCENT.GOLD, rgb: "201, 144, 43" },
];

// Default: the friendly blue (matches the prior hardcoded selection colour).
export const DEFAULT_ACCENT: Accent = ACCENT.BLUE;

// What dragging entries onto a folder does: MOVE them there, or COPY them there.
export const DRAG_DROP_ACTION = {
  MOVE: "move",
  COPY: "copy",
} as const;

export type DragDropAction =
  (typeof DRAG_DROP_ACTION)[keyof typeof DRAG_DROP_ACTION];

// Default: move (matches most file managers).
export const DEFAULT_DRAG_DROP_ACTION: DragDropAction = DRAG_DROP_ACTION.MOVE;

// Where a user-defined context-menu process action is eligible to appear. DIRECTORY is the empty
// floor/current folder, FOLDER is a child folder entry, and FILE can additionally be filtered by
// extension. These values persist in context_menu.toml and mirror context_menu.rs.
export const CUSTOM_ACTION_TARGET = {
  DIRECTORY: "directory",
  FOLDER: "folder",
  FILE: "file",
} as const;

export type CustomActionTarget =
  (typeof CUSTOM_ACTION_TARGET)[keyof typeof CUSTOM_ACTION_TARGET];

// Curated Font Awesome keys available to user-defined actions. Font Awesome icons are compile-time
// objects, so persisted config stores one of these stable names rather than arbitrary icon data.
export const CUSTOM_ACTION_ICON = {
  BOLT: "bolt",
  CODE: "code",
  TERMINAL: "terminal",
  APP: "app",
  PLAY: "play",
  GEAR: "gear",
  FILE: "file",
  FOLDER: "folder",
} as const;

export type CustomActionIcon =
  (typeof CUSTOM_ACTION_ICON)[keyof typeof CUSTOM_ACTION_ICON];

// Seed settings used before settings.toml is hydrated and as the reset-to-default baseline in the
// settings dialog. Must match the Rust defaults (functions/settings.rs).
export const DEFAULT_SETTINGS: AppSettings = {
  showHidden: false,
  theme: DEFAULT_THEME,
  accentColor: DEFAULT_ACCENT,
  defaultZoom: ZOOM_DEFAULT,
  gridIconSize: DEFAULT_GRID_ICON_SIZE,
  zoomWithModifierWheel: true,
  dateFormat: DEFAULT_DATE_FORMAT,
  sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
  contextMenuOpacity: DEFAULT_CONTEXT_MENU_OPACITY,
  previewControlsOpacity: DEFAULT_PREVIEW_CONTROLS_OPACITY,
  dialogOpacity: DEFAULT_DIALOG_OPACITY,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  hideSystemRecents: true,
  showToasts: true,
  startupMode: DEFAULT_STARTUP_MODE,
  homePath: "",
  activateNewTabs: true,
  rememberScrollOnUp: false,
  dragDropAction: DEFAULT_DRAG_DROP_ACTION,
  confirmDragDrop: true,
  confirmDelete: true,
  clickableToasts: true,
  dragToExternalApps: true,
  useCustomFolderPicker: false,
  previewImagesInApp: false,
  previewMarkdownInApp: false,
  openPreviewInWindow: false,
  openPropertiesInWindow: false,
  confirmExportOverwrite: false,
  remoteThumbnails: false,
  showSystemStats: false,
  showFolderSizes: false,
  showVolumeSize: false,
  sizeIgnores: isMacPlatform() ? [...MACOS_SIZE_IGNORES] : [],
  fileTypeExtensions: structuredClone(DEFAULT_FILE_TYPE_EXTENSIONS),
  colorfulFileTypes: false,
  showOnboarding: true,
  onboardingSeen: false,
  checkForUpdates: true,
  lastSeenVersion: "",
  showChangelogAfterUpdate: true,
};

// DOM KeyboardEvent.key names used in non-configurable key handling (navigation, input
// submit/cancel). These are not user-rebindable bindings — see shared/keymap for those — but
// they still shouldn't be raw string literals scattered through the code.
export const KEY = {
  ENTER: "Enter",
  ESCAPE: "Escape",
  S: "s",
  F: "f",
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

// The main application window's Tauri label. Runtime windows get "win-N" labels; the main window
// keeps this fixed label (its tab session restores on launch, it runs the startup cleanup, etc.).
export const MAIN_WINDOW_LABEL = "main";

// The app's on-disk data locations (see AppStorageLocation / functions/storage.rs). Stable ids,
// each mapped to a localized label in the Storage settings panel.
export const STORAGE_KIND = {
  CONFIG: "config",
  CACHE: "cache",
} as const;

export type StorageKind = (typeof STORAGE_KIND)[keyof typeof STORAGE_KIND];

// What a cleanup removes from a registered folder (see CleanupTarget / functions/cleanup.rs).
// CONTENTS empties the folder but keeps it — required for caches whose parent directory must
// survive (e.g. ~/.gradle/caches). FOLDER trashes the registered folder itself, for whole obsolete
// directories. Every cleanup goes to the system Trash, so both modes stay reversible.
export const CLEANUP_MODE = {
  CONTENTS: "contents",
  FOLDER: "folder",
} as const;

export type CleanupMode = (typeof CLEANUP_MODE)[keyof typeof CLEANUP_MODE];

// Stable error codes the cleanup commands return instead of prose, so the message shown to the user
// comes from the translation dictionary. Mirrors the ERROR_* constants in functions/cleanup.rs; any
// other value is a raw backend error and is surfaced as-is.
export const CLEANUP_ERROR = {
  NOT_ABSOLUTE: "CLEANUP_NOT_ABSOLUTE",
  NOT_A_DIR: "CLEANUP_NOT_A_DIR",
  PROTECTED_PATH: "CLEANUP_PROTECTED_PATH",
  DUPLICATE: "CLEANUP_DUPLICATE",
  UNKNOWN_TARGET: "CLEANUP_UNKNOWN_TARGET",
  INVALID_MODE: "CLEANUP_INVALID_MODE",
} as const;

export type CleanupError = (typeof CLEANUP_ERROR)[keyof typeof CLEANUP_ERROR];

// Path scheme marking a remote (SSH/SFTP) location: `sftp://<connId>/absolute/remote/path`. The
// backend routes these to the SFTP backend; every other path is local. Mirrors SFTP_SCHEME in
// src-tauri/src/filesystem/sftp.rs. See SSH_PLAN.md.
export const SFTP_SCHEME = "sftp://";

// Path scheme marking a saved SMB (Windows share) location: `smb://<host>/<share>`. Unlike SFTP,
// these are not browsed through a virtual backend — macOS mounts the share under /Volumes and the
// local filesystem cores browse it there. The scheme is only how the location is stored/identified
// in the sidebar; clicking it resolves (mounting if needed) to the real /Volumes path. Mirrors
// SMB_SCHEME in src-tauri/src/filesystem/smb.rs.
export const SMB_SCHEME = "smb://";

// Prefix the SFTP backend puts on an authentication-failure error (vs network/other), so the UI can
// prompt for a password/passphrase instead of a generic error. Mirrors AUTH_FAILED_MARKER in
// src-tauri/src/filesystem/sftp.rs.
export const SSH_AUTH_FAILED = "SSH_AUTH_FAILED";

// Prefix the SFTP backend puts on a changed-host-key error (possible MITM), so the UI can show a
// clear security warning instead of a generic failure. Mirrors HOST_KEY_CHANGED_MARKER in sftp.rs.
export const SSH_HOST_KEY_CHANGED = "SSH_HOST_KEY_CHANGED";

// Semantic UI colors for elements that support a color variant (e.g. menu items, buttons).
// Values double as CSS modifier class names.
export const UI_COLOR = {
  DEFAULT: "default",
  DANGER: "danger",
} as const;

export type UiColor = (typeof UI_COLOR)[keyof typeof UI_COLOR];
