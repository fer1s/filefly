import type { AppSettings } from "@/shared/services/api";

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
export const ZOOM_MAX = 3;
export const ZOOM_STEP = 0.25;
export const ZOOM_DEFAULT = 1;

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

// Seed settings used before settings.toml is hydrated and as the reset-to-default baseline in the
// settings dialog. Must match the Rust defaults (functions/settings.rs).
export const DEFAULT_SETTINGS: AppSettings = {
  showHidden: false,
  theme: DEFAULT_THEME,
  accentColor: DEFAULT_ACCENT,
  defaultZoom: ZOOM_DEFAULT,
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
  dragDropAction: DEFAULT_DRAG_DROP_ACTION,
  confirmDragDrop: true,
  confirmDelete: true,
  clickableToasts: true,
  dragToExternalApps: true,
  useCustomFolderPicker: false,
  previewImagesInApp: false,
  previewMarkdownInApp: false,
  confirmExportOverwrite: false,
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

// Semantic UI colors for elements that support a color variant (e.g. menu items, buttons).
// Values double as CSS modifier class names.
export const UI_COLOR = {
  DEFAULT: "default",
  DANGER: "danger",
} as const;

export type UiColor = (typeof UI_COLOR)[keyof typeof UI_COLOR];
