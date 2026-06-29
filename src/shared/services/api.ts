import { invoke, Channel } from "@tauri-apps/api/core";
import { watchImmediate } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { Volume, DirEntry, ContextMenuLayout } from "@/shared/models";
import { ACCESS_DENIED_ERROR } from "@/shared/constants";
import type { Keymap } from "@/shared/keymap/types";

// App-wide user settings, persisted in settings.toml (Rust is the source of truth; the frontend
// hydrates from this on launch). Mirrors the AppSettings struct in functions/settings.rs.
export type AppSettings = {
  showHidden: boolean;
  defaultZoom: number;
  dateFormat: string;
  sidebarOpacity: number;
  hideSystemRecents: boolean;
  showToasts: boolean;
};

// Load the persisted app settings (falls back to defaults when settings.toml is absent).
export const getSettings = async (): Promise<AppSettings> =>
  (await invoke("get_settings")) as AppSettings;

// Persist the whole app-settings struct to settings.toml.
export const setSettings = async (settings: AppSettings): Promise<void> =>
  await invoke("set_settings", { settings });

// Load the keybindings (reads keymap.toml, falling back to bundled defaults).
export const getKeymap = async (): Promise<Keymap> =>
  (await invoke("get_keymap")) as Keymap;

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
