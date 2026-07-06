import { invoke, Channel } from "@tauri-apps/api/core";
import { watchImmediate } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { startDrag } from "@crabnebula/tauri-plugin-drag";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { Volume, DirEntry, ContextMenuLayout, Tag } from "@/shared/models";
import { ACCESS_DENIED_ERROR } from "@/shared/constants";
import type { Keymap } from "@/shared/keymap/types";

// App-wide user settings, persisted in settings.toml (Rust is the source of truth; the frontend
// hydrates from this on launch). Mirrors the AppSettings struct in functions/settings.rs.
export type AppSettings = {
  showHidden: boolean;
  defaultZoom: number;
  dateFormat: string;
  sidebarOpacity: number;
  // Expanded-sidebar width in px (see SIDEBAR_WIDTH_MIN/MAX).
  sidebarWidth: number;
  hideSystemRecents: boolean;
  showToasts: boolean;
  // Launch behavior: "restore" | "volumes" | "home" (see STARTUP_MODE).
  startupMode: string;
  // Folder opened on launch when startupMode is "home" (empty = Volumes view).
  homePath: string;
  // What dragging entries onto a folder does: "move" | "copy" (see DRAG_DROP_ACTION).
  dragDropAction: string;
  // Whether a confirmation dialog is shown before a drag-and-drop move/copy.
  confirmDragDrop: boolean;
  // Whether success toasts are clickable to jump to the affected file/folder.
  clickableToasts: boolean;
  // Whether dragging entries out of the window starts a native OS drag (drop into other apps).
  dragToExternalApps: boolean;
};

// Load the persisted app settings (falls back to defaults when settings.toml is absent).
export const getSettings = async (): Promise<AppSettings> =>
  (await invoke("get_settings")) as AppSettings;

// Persist the whole app-settings struct to settings.toml.
export const setSettings = async (settings: AppSettings): Promise<void> =>
  await invoke("set_settings", { settings });

// Per-group sidebar customization, persisted in sidebar.toml (keyed by stable group id). Mirrors
// the SidebarGroup struct in functions/sidebar.rs. `name` is absent until the user renames a group.
export type SidebarGroupConfig = {
  name?: string;
  order?: number;
  items?: string[];
  // Stable ids of built-in preset rows the user has hidden (presets are hidden, never deleted).
  hiddenPresets?: string[];
  // True for user-created groups (renamable + deletable). Absent/false for the built-in groups.
  custom?: boolean;
};
export type SidebarGroups = Record<string, SidebarGroupConfig>;

// Load all saved sidebar group settings (empty object when sidebar.toml is absent).
export const getSidebarGroups = async (): Promise<SidebarGroups> =>
  (await invoke("get_sidebar_groups")) as SidebarGroups;

// Persist a custom name for one sidebar group.
export const setSidebarGroupName = async (
  id: string,
  name: string,
): Promise<void> => await invoke("set_sidebar_group_name", { id, name });

// Persist the group display order from a top-to-bottom list of group ids.
export const setSidebarOrder = async (ids: string[]): Promise<void> =>
  await invoke("set_sidebar_order", { ids });

// Persist a group's user-added item paths (the full ordered list).
export const setSidebarItems = async (
  id: string,
  items: string[],
): Promise<void> => await invoke("set_sidebar_items", { id, items });

// Persist the set of hidden built-in preset ids for a group (the full list after a toggle).
export const setHiddenPresets = async (
  id: string,
  presets: string[],
): Promise<void> => await invoke("set_hidden_presets", { id, presets });

// Create a user group with a generated id, display name and display position.
export const addSidebarGroup = async (
  id: string,
  name: string,
  order: number,
): Promise<void> => await invoke("add_sidebar_group", { id, name, order });

// Delete a group entirely (its items/name go with it). For custom groups only.
export const deleteSidebarGroup = async (id: string): Promise<void> =>
  await invoke("delete_sidebar_group", { id });

// Open the native folder picker; resolves to the chosen directory path, or null if cancelled.
export const pickFolder = async (): Promise<string | null> => {
  const result = await openDialog({ directory: true, multiple: false });
  return typeof result === "string" ? result : null;
};

// Load the keybindings (reads keymap.toml, falling back to bundled defaults).
export const getKeymap = async (): Promise<Keymap> =>
  (await invoke("get_keymap")) as Keymap;

// Finder tags for a batch of paths, keyed by path (macOS only; empty on other platforms). Lazy —
// call for the rows currently shown, not the whole directory.
export const getFileTags = async (
  paths: string[],
): Promise<Record<string, Tag[]>> =>
  (await invoke("get_tags_for", { paths })) as Record<string, Tag[]>;

// Replace a file's Finder tags (macOS only; a no-op elsewhere). An empty list clears them.
export const setFileTags = async (path: string, tags: Tag[]): Promise<void> => {
  await invoke("set_file_tags", { path, tags });
};

// Files carrying a given Finder tag (macOS only; empty elsewhere), via Spotlight.
export const findTagged = async (tag: string): Promise<DirEntry[]> =>
  (await invoke("find_tagged", { tag })) as DirEntry[];

// Distinct Finder tags currently in use (macOS only; empty elsewhere), for the sidebar list.
export const listAllTags = async (): Promise<Tag[]> =>
  (await invoke("list_all_tags")) as Tag[];

// Load the context-menu layout (reads context_menu.toml, falling back to bundled defaults).
export const getContextMenu = async (): Promise<ContextMenuLayout> =>
  (await invoke("get_context_menu")) as ContextMenuLayout;

// Visible list columns for a folder (saved preference, or a well-known-folder default).
export const getFolderColumns = async (path: string): Promise<string[]> =>
  (await invoke("get_folder_columns", { path })) as string[];

// Persist the visible list columns for a folder to the central config file.
export const setFolderColumns = async (
  path: string,
  columns: string[],
): Promise<void> => await invoke("set_folder_columns", { path, columns });

// Saved grid/list view for a folder (null when the user hasn't set one).
export const getFolderView = async (path: string): Promise<string | null> =>
  (await invoke("get_folder_view", { path })) as string | null;

// Persist the grid/list view for a folder to the central config file.
export const setFolderView = async (
  path: string,
  view: string,
): Promise<void> => await invoke("set_folder_view", { path, view });

// Saved column sort for a folder (null when the user hasn't sorted it).
export const getFolderSort = async (
  path: string,
): Promise<{ key: string; direction: string } | null> =>
  (await invoke("get_folder_sort", { path })) as {
    key: string;
    direction: string;
  } | null;

// Persist the column sort for a folder to the central config file.
export const setFolderSort = async (
  path: string,
  key: string,
  direction: string,
): Promise<void> => await invoke("set_folder_sort", { path, key, direction });

// Saved zoom level for a folder (null when the user hasn't zoomed it).
export const getFolderZoom = async (path: string): Promise<number | null> =>
  (await invoke("get_folder_zoom", { path })) as number | null;

// Persist the zoom level for a folder to the central config file.
export const setFolderZoom = async (
  path: string,
  zoom: number,
): Promise<void> => await invoke("set_folder_zoom", { path, zoom });

// Get the user's disks (volumes)
export const getVolumes = async (): Promise<Volume[]> =>
  await invoke("get_volumes");

// Eject/unmount a removable volume by its mount point (macOS: diskutil eject). Throws on failure.
export const ejectVolume = async (mountPoint: string): Promise<void> =>
  await invoke("eject_volume", { mountPoint });

// Read directory invokement method. Rethrows ACCESS_DENIED_ERROR so the UI can prompt for Full
// Disk Access; any other failure (invalid/missing path) resolves to an empty listing.
export const readDirectory = async (path: string): Promise<DirEntry[]> => {
  try {
    return (await invoke("read_directory", { path })) as DirEntry[];
  } catch (err) {
    if (String(err).includes(ACCESS_DENIED_ERROR)) throw err;
    console.error("Path is either not valid or does not exist:\n" + err);
    return [];
  }
};

// Recursively search under `path` for entries whose name contains `query` (case-insensitive).
export const searchDirectory = async (
  path: string,
  query: string,
): Promise<DirEntry[]> =>
  (await invoke("search_directory", { path, query })) as DirEntry[];

export const getEntry = async (path: string): Promise<DirEntry> =>
  await invoke("get_entry", { path });

// Probe whether a directory is actually writable (the truth for read-only mounts like NTFS on
// macOS without a write driver). Returns false on any failure.
export const canWrite = async (path: string): Promise<boolean> =>
  (await invoke("can_write", { path })) as boolean;

// Watch a directory for filesystem changes (e.g. files added/removed/renamed from the terminal).
// Fires `onChange` on every event; returns a function that stops watching. Non-recursive — only
// changes directly inside the folder matter for the listing.
export const watchDirectory = async (
  path: string,
  onChange: () => void,
): Promise<() => void> => await watchImmediate(path, () => onChange());

// Recursively computed total size (bytes) of a directory.
export const getDirSize = async (path: string): Promise<number> =>
  await invoke("get_dir_size", { path });

// Recently modified files (Finder-style Recents), newest first. macOS only (Spotlight). When
// `hideAppFiles` is set, this app's own background files (config/cache/temp) are filtered out.
export const getRecentFiles = async (
  hideAppFiles: boolean,
): Promise<DirEntry[]> =>
  (await invoke("get_recent_files", { hideAppFiles })) as DirEntry[];

// Generate (or fetch from cache) a downscaled thumbnail for an image file. Returns the
// filesystem path to the thumbnail (load it via convertFileSrc).
export const getThumbnail = async (
  path: string,
  size: number,
): Promise<string> => await invoke("get_thumbnail", { path, size });

// Open a file with the OS default application. Goes through the Rust `open_file` command so the path
// is logged to the Tauri terminal; the command returns the error if it fails.
export const openFile = async (path: string): Promise<void> => {
  try {
    await invoke("open_file", { path });
  } catch (err) {
    notify(t.errors.open(String(err)), TOAST_TYPE.ERROR);
  }
};

export const openInTerminal = async (path: string): Promise<void> => {
  try {
    await invoke("open_in_terminal", { path });
  } catch (error) {
    notify(t.errors.openInTerminal(String(error)), TOAST_TYPE.ERROR);
  }
};

// Generate markdown preview invokement method
export const generateMarkdownPreview = async (path: string): Promise<string> =>
  (await invokeWithPathArg("md_to_html", path)) as string;

// Byte progress streamed from a copy/move while it runs.
export type CopyProgress = { processed: number; total: number };

// Filesystem operations. These throw on error (the Rust command returns a Result) so callers can surface it.
// copy/move stream byte progress over an IPC Channel; pass `onProgress` to observe it.
export const copyEntry = async (
  source: string,
  destDir: string,
  onProgress?: (progress: CopyProgress) => void,
): Promise<void> => {
  const channel = new Channel<CopyProgress>();
  if (onProgress) channel.onmessage = onProgress;
  await invoke("copy_entry", { source, destDir, onProgress: channel });
};
export const moveEntry = async (
  source: string,
  destDir: string,
  onProgress?: (progress: CopyProgress) => void,
): Promise<void> => {
  const channel = new Channel<CopyProgress>();
  if (onProgress) channel.onmessage = onProgress;
  await invoke("move_entry", { source, destDir, onProgress: channel });
};
export const renameEntry = async (
  path: string,
  newName: string,
): Promise<void> => await invoke("rename_entry", { path, newName });
// Create a new folder in `parent`; returns the created folder's path.
export const createFolder = async (parent: string): Promise<string> =>
  (await invoke("create_folder", { parent })) as string;
// Copy an image file to the system clipboard as a bitmap.
export const copyImage = async (path: string): Promise<void> =>
  await invoke("copy_image", { path });
export const deleteEntry = async (path: string): Promise<void> =>
  await invoke("delete_entry", { path });
// Restore a trashed item to its recorded original location. Resolves to the restored path, or
// null when we have no record of where it came from (caller should then ask the user).
export const restoreTrashed = async (path: string): Promise<string | null> =>
  (await invoke("restore_trashed", { trashedPath: path })) as string | null;
export const deleteEntryPermanently = async (path: string): Promise<void> =>
  await invoke("delete_entry_permanently", { path });
// Permanently empty the system Trash (~/.Trash). Resolves to the number of items removed.
// Throws (ACCESS_DENIED-style) when the OS blocks reading the Trash.
export const emptyTrash = async (): Promise<number> =>
  (await invoke("empty_trash")) as number;

// Open the OS privacy settings (macOS Full Disk Access) so the user can grant access to
// protected folders like the Trash.
export const openFullDiskAccessSettings = async (): Promise<void> =>
  await invoke("open_full_disk_access_settings");

// Open a URL in the user's default browser (used by the NTFS driver guidance links).
export const openExternalUrl = async (url: string): Promise<void> =>
  await openUrl(url);

// Bundled fallback drag preview, resolved once at startup so startNativeDrag can run fully
// synchronously (the native drag only latches when started within the drag's event tick — an
// await before startDrag breaks it).
let bundledDragIcon = "";
export const prewarmDragIcon = async (): Promise<void> => {
  if (bundledDragIcon) return;
  try {
    bundledDragIcon = await resolveResource("icons/32x32.png");
  } catch (err) {
    console.error("Failed to resolve drag icon:\n" + err);
  }
};

// Start a native OS drag of real files, so they can be dropped into other apps (Finder, Mail,
// WhatsApp, …) and back into our own window. `icon` is a filesystem path to the preview image
// (e.g. a cached thumbnail); it falls back to the bundled icon. `mode` sets the OS drop-effect
// badge (copy → green "+", move → arrow). Synchronous on purpose — see prewarmDragIcon.
export const startNativeDrag = (
  paths: string[],
  icon?: string,
  mode?: "copy" | "move",
): void => {
  const image = icon || bundledDragIcon;
  if (!paths.length || !image) return;
  void startDrag({ item: paths, icon: image, mode });
};

// Helper function to invoke methods with a path argument
const invokeWithPathArg = async (
  method: "md_to_html",
  path: string,
): Promise<string | void> =>
  await invoke(method, { path: path })
    .then((value) => value as string | void)
    .catch((err) => {
      console.error("Path is either not valid or does not exist:\n" + err);
      return;
    });
