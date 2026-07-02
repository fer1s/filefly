import { Volume, DirEntry, Tab } from "@/shared/models";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import {
  type ViewMode,
  type StartupMode,
  type DragDropAction,
} from "@/shared/constants";

export type State = {
  fs: FileSystemManager;
  volumes: Volume[];
  setVolumes: (volumes: Volume[]) => void;
  // Open tabs and the active one. Navigation/search below always act on the active tab.
  tabs: Tab[];
  activeTabId: string;
  // Open a new tab; defaults to the current location, or pass a path to open it there.
  newTab: (path?: string) => void;
  closeTab: (id: string) => void;
  selectTab: (id: string) => void;
  // Reorder tabs by moving the one at index `from` to index `to` (drag-to-reorder).
  reorderTab: (from: number, to: number) => void;
  path: string;
  setPath: (path: string) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  goBack: () => void;
  goForward: () => void;
  dirContent: DirEntry[];
  setDirContent: (dirContent: DirEntry[]) => void;
  // True when the current directory could not be read due to OS privacy protection
  // (e.g. macOS Full Disk Access required for the Trash).
  accessDenied: boolean;
  view: ViewMode;
  setView: (view: ViewMode) => void;
  // Whether hidden entries (dotfiles) are shown in the listing. Toggled via the keymap.
  showHidden: boolean;
  toggleShowHidden: () => void;
  // Hide this app's own background files (config/cache/temp) from the Recents listing.
  hideSystemRecents: boolean;
  toggleHideSystemRecents: () => void;
  // Whether transient toast notifications are surfaced in the UI.
  showToasts: boolean;
  toggleShowToasts: () => void;
  // Directory zoom multiplier (1 = 100%), persisted per folder.
  zoom: number;
  zoomIn: () => void;
  zoomOut: () => void;
  // Set the directory zoom to an absolute multiplier (driven by the slider).
  setZoomTo: (zoom: number) => void;
  // Configurable default zoom for folders without their own saved zoom.
  defaultZoom: number;
  setDefaultZoom: (zoom: number) => void;
  // The date format used wherever dates are shown (a token pattern or the locale sentinel).
  dateFormat: string;
  setDateFormat: (format: string) => void;
  // Sidebar background opacity (alpha of --color-background-sidebar), 0..1.
  sidebarOpacity: number;
  setSidebarOpacity: (opacity: number) => void;
  // Expanded-sidebar width in px, driven by dragging its right edge (see SIDEBAR_WIDTH_MIN/MAX).
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  // What the app opens on launch (see STARTUP_MODE), and the folder used when mode is "home".
  // Takes effect on the next launch (tab restoration runs at mount).
  startupMode: StartupMode;
  setStartupMode: (mode: StartupMode) => void;
  homePath: string;
  setHomePath: (path: string) => void;
  // What dragging entries onto a folder does: move them there (default) or copy them there.
  dragDropAction: DragDropAction;
  setDragDropAction: (action: DragDropAction) => void;
  // Whether a confirmation dialog is shown before a drag-and-drop move/copy.
  confirmDragDrop: boolean;
  toggleConfirmDragDrop: () => void;
  // Whether success toasts are clickable to jump to the affected file/folder.
  clickableToasts: boolean;
  toggleClickableToasts: () => void;
  // Whether dragging entries out of the window starts a native OS drag (drop into other apps).
  dragToExternalApps: boolean;
  toggleDragToExternalApps: () => void;
  // True while a settings change is being written to settings.toml (drives the StatusBar spinner).
  savingSettings: boolean;
  search: string;
  setSearch: (search: string) => void;
  refreshDir: () => void;
  // Whether the right info panel (preview + properties of the single selected entry) is shown.
  infoPanelOpen: boolean;
  toggleInfoPanel: () => void;
};
