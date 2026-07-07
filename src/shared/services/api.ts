import { invoke, Channel } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { watchImmediate } from "@tauri-apps/plugin-fs";
import { openUrl } from "@tauri-apps/plugin-opener";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { resolveResource } from "@tauri-apps/api/path";
import { startDrag } from "@crabnebula/tauri-plugin-drag";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { Volume, DirEntry, ContextMenuLayout, Tag } from "@/shared/models";
import {
  ACCESS_DENIED_ERROR,
  SFTP_SCHEME,
  type DragDropAction,
  type StorageKind,
} from "@/shared/constants";
import type { Keymap } from "@/shared/keymap/types";

// App-wide user settings, persisted in settings.toml (Rust is the source of truth; the frontend
// hydrates from this on launch). Mirrors the AppSettings struct in functions/settings.rs.
export type AppSettings = {
  showHidden: boolean;
  // Colour theme: "system" (follow OS) | "light" | "dark" (see THEME).
  theme: string;
  // Accent hue driving selection/focus/links: "blue" | "navy" | "red" | "teal" | "gold" (see ACCENT).
  accentColor: string;
  defaultZoom: number;
  dateFormat: string;
  sidebarOpacity: number;
  // Context-menu background opacity (alpha of the popover surface), 0..1.
  contextMenuOpacity: number;
  // Preview floating-controls pill background opacity (alpha of the popover surface), 0..1.
  previewControlsOpacity: number;
  // Dialog (modal) background opacity (alpha of the modal surface), 0..1.
  dialogOpacity: number;
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
  // Whether a confirmation dialog is shown before moving entries to the Trash (permanent delete
  // always confirms regardless).
  confirmDelete: boolean;
  // Whether success toasts are clickable to jump to the affected file/folder.
  clickableToasts: boolean;
  // Whether dragging entries out of the window starts a native OS drag (drop into other apps).
  dragToExternalApps: boolean;
  // Use the app's own in-window folder picker instead of the native OS (Finder) folder dialog.
  useCustomFolderPicker: boolean;
  // Open images in the app's built-in preview (on Enter/double-click) instead of the OS default app.
  previewImagesInApp: boolean;
  // Open markdown files in the app's built-in preview (on Enter/double-click) instead of the OS
  // default app.
  previewMarkdownInApp: boolean;
  // Open the built-in preview in its own detached window instead of the in-app overlay. A new
  // window is spawned per open (see openPreviewWindow / window::create_preview_window).
  openPreviewInWindow: boolean;
  // On export, ask before replacing an existing settings.toml. When off (default), a unique
  // filename is used instead so nothing is overwritten silently.
  confirmExportOverwrite: boolean;
  // Generate thumbnails for images on remote (SFTP) hosts. Off by default — each downloads the whole
  // file over the network. See SSH_PLAN.md phase 4.
  remoteThumbnails: boolean;
  // Show a live CPU / RAM / disk readout in the status bar. Off by default (it polls the OS).
  showSystemStats: boolean;
  // Compute and show recursive folder sizes in the list-view "Size" column. Off by default (each
  // folder is walked; results are cached in size_index.db).
  showFolderSizes: boolean;
  // Show "used / total" text under each volume's usage bar in the sidebar. Off by default.
  showVolumeSize: boolean;
  // Glob patterns (matched against an entry's file name) excluded from recursive folder-size
  // calculation, e.g. ".DS_Store", "*.tmp", "node_modules". Applied live on save.
  sizeIgnores: string[];
};

// Load the persisted app settings (falls back to defaults when settings.toml is absent).
export const getSettings = async (): Promise<AppSettings> =>
  (await invoke("get_settings")) as AppSettings;

// Persist the whole app-settings struct to settings.toml.
export const setSettings = async (settings: AppSettings): Promise<void> =>
  await invoke("set_settings", { settings });

// Read + parse a settings.toml the user chose (missing keys fall back to defaults). Returns the
// parsed settings for the caller to apply; does not persist. Rejects on read/parse failure.
export const importSettings = async (path: string): Promise<AppSettings> =>
  (await invoke("import_settings", { path })) as AppSettings;

// Result of an export attempt: `path` is the file written (null when it stopped to ask about an
// overwrite); `existed` is true when a settings.toml was already present and left untouched.
export type ExportResult = { path: string | null; existed: boolean };

// Write the given settings as a settings.toml into `dir`. With `unique`, writes to the first free
// settings[-N].toml (never overwrites). Otherwise targets settings.toml: if it exists and
// `overwrite` is false, nothing is written and `existed` is true (so the caller can confirm and
// retry with `overwrite: true`).
export const exportSettings = async (
  dir: string,
  settings: AppSettings,
  unique: boolean,
  overwrite: boolean,
): Promise<ExportResult> =>
  (await invoke("export_settings", {
    dir,
    settings,
    unique,
    overwrite,
  })) as ExportResult;

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

// Open the native file picker; resolves to the chosen file path, or null if cancelled. When
// `extensions` is given, the dialog restricts selection to those extensions.
export const pickFile = async (
  extensions?: readonly string[],
): Promise<string | null> => {
  const result = await openDialog({
    directory: false,
    multiple: false,
    filters:
      extensions && extensions.length > 0
        ? [{ name: "Files", extensions: [...extensions] }]
        : undefined,
  });
  return typeof result === "string" ? result : null;
};

// Reply to a headless `probe` control request (drag-drop diagnostics) with the computed result,
// tagged with the request id received on the `control://probe` event. See functions/control.rs.
export const setProbeResult = async (id: number, data: string): Promise<void> =>
  await invoke("set_probe_result", { id, data });

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

// A live snapshot of host resource usage for the optional status-bar readout. cpuUsage is a 0..100
// percentage across all cores; the rest are raw byte counts. Mirrors SystemStats in
// functions/os_stats.rs.
export type SystemStats = {
  cpuUsage: number;
  memUsed: number;
  memTotal: number;
  diskUsed: number;
  diskTotal: number;
};

// Current CPU / memory / boot-disk usage. Cheap enough to poll on a short interval; backed by a
// persistent System handle in Rust so CPU deltas are accurate between calls.
export const getSystemStats = async (): Promise<SystemStats> =>
  (await invoke("get_system_stats")) as SystemStats;

// Open the OS Storage settings pane (macOS: System Settings › General › Storage). Backs clicking
// the disk readout in the status bar. No-op on platforms without such a pane.
export const openStorageSettings = async (): Promise<void> =>
  await invoke("open_storage_settings");

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

// A live folder-size update pushed by the size-index watcher (see watcher.rs): `path` is a folder
// whose recursive size just changed, `size` its new total in bytes.
export type DirSizeChanged = { path: string; size: number };

// Start the recursive size-index watcher on `path`, replacing any previous watch (there's one
// active watcher for the viewed folder). Pass an empty/non-directory path to stop watching. Fired
// on navigation so live filesystem changes bubble into the size cache and keep it fresh.
export const watchDirSizes = async (path: string): Promise<void> =>
  await invoke("watch_directory", { path });

// Subscribe to live folder-size updates emitted by the watcher. Returns an unlisten function.
export const onDirSizeChanged = async (
  onChange: (change: DirSizeChanged) => void,
): Promise<() => void> =>
  await listen<DirSizeChanged>("dir-size-changed", (event) =>
    onChange(event.payload),
  );

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

// Render a markdown source string to HTML (renders the in-editor draft, so unsaved edits preview).
export const renderMarkdown = async (content: string): Promise<string> =>
  (await invoke("md_render", { content })) as string;

// Read a text file's raw contents (the markdown source for the built-in editor). Throws on failure.
export const readTextFile = async (path: string): Promise<string> =>
  (await invoke("read_text_file", { path })) as string;

// Overwrite a text file with `content` (Cmd+S from the markdown editor). Throws on failure.
export const writeTextFile = async (
  path: string,
  content: string,
): Promise<void> => await invoke("write_text_file", { path, content });

// Byte progress streamed from a copy/move while it runs.
export type CopyProgress = { processed: number; total: number };

// Filesystem operations. These throw on error (the Rust command returns a Result) so callers can surface it.
// copy/move stream byte progress over an IPC Channel; pass `onProgress` to observe it.
// copy/move resolve to the final destination path, which differs from destDir/basename when a
// name collision triggered a rename (e.g. "file (1).txt").
export const copyEntry = async (
  source: string,
  destDir: string,
  onProgress?: (progress: CopyProgress) => void,
): Promise<string> => {
  const channel = new Channel<CopyProgress>();
  if (onProgress) channel.onmessage = onProgress;
  return (await invoke("copy_entry", {
    source,
    destDir,
    onProgress: channel,
  })) as string;
};
export const moveEntry = async (
  source: string,
  destDir: string,
  onProgress?: (progress: CopyProgress) => void,
): Promise<string> => {
  const channel = new Channel<CopyProgress>();
  if (onProgress) channel.onmessage = onProgress;
  return (await invoke("move_entry", {
    source,
    destDir,
    onProgress: channel,
  })) as string;
};
// Compress the given entries into a new .zip inside `destDir`, at DEFLATE `level` (0..9). Streams
// byte progress (input bytes read) over the same Channel as copy. Resolves to the created archive's
// path, which differs from destDir/archiveName when a name collision forced a rename.
export const compressEntries = async (
  sources: string[],
  destDir: string,
  archiveName: string,
  level: number,
  password?: string,
  onProgress?: (progress: CopyProgress) => void,
): Promise<string> => {
  const channel = new Channel<CopyProgress>();
  if (onProgress) channel.onmessage = onProgress;
  return (await invoke("compress_entries", {
    sources,
    destDir,
    archiveName,
    level,
    password: password || null,
    onProgress: channel,
  })) as string;
};

// True if the zip has any encrypted entry, so the caller can prompt for a password before extract.
export const archiveEncrypted = async (archive: string): Promise<boolean> =>
  (await invoke("archive_encrypted", { archive })) as boolean;

// True if a 7-Zip binary (7zz/7z/7za) is on PATH. Gates the "To 7z" compress option and .7z extract.
export const sevenzipAvailable = async (): Promise<boolean> =>
  (await invoke("sevenzip_available")) as boolean;

// Extract a .zip into `destDir`. `password` decrypts an encrypted archive. `intoSubfolder` wraps
// output in a new subfolder named after the archive ("Extract to Folder"); when false, the archive's
// top-level entries land directly in `destDir` ("Extract Here"). Resolves to the created top-level
// output paths (for reveal/select).
export const extractArchive = async (
  archive: string,
  destDir: string,
  password?: string,
  intoSubfolder = false,
  onProgress?: (progress: CopyProgress) => void,
): Promise<string[]> => {
  const channel = new Channel<CopyProgress>();
  if (onProgress) channel.onmessage = onProgress;
  return (await invoke("extract_archive", {
    archive,
    destDir,
    password: password || null,
    intoSubfolder,
    onProgress: channel,
  })) as string[];
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

// Open the OS resource monitor (macOS Activity Monitor, Windows Task Manager, Linux system monitor).
// Backs clicking the CPU/RAM readout in the status bar.
export const openSystemMonitor = async (): Promise<void> =>
  await invoke("open_system_monitor");

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
  mode?: DragDropAction,
): void => {
  const image = icon || bundledDragIcon;
  if (!paths.length || !image) return;
  void startDrag({ item: paths, icon: image, mode });
};

// Record a folder the user navigated to in the app's own recent-folders list (backs the macOS
// Dock right-click menu). Deduped/capped/persisted in Rust; safe to call on every navigation.
export const pushRecentFolder = async (path: string): Promise<void> =>
  await invoke("push_recent_folder", { path });

// Clear the Dock recent-folders list.
export const clearRecentFolders = async (): Promise<void> =>
  await invoke("clear_recent_folders");

// Open a new app window (a fresh browser window with its own tab session). No-op arg; the backend
// assigns a unique label and clones the main window's chrome.
export const openNewWindow = async (): Promise<void> =>
  await invoke("open_new_window");

// Open a new app window rooted at `path` (a fresh browser window that starts at the given folder,
// e.g. one of the app's data directories from the Storage settings).
export const openPathInNewWindow = async (path: string): Promise<void> =>
  await invoke("open_path_in_new_window", { path });

// Open the built-in preview for `path` in its own detached window (used when openPreviewInWindow is
// on). A fresh window is spawned per call so several previews can sit side by side.
export const openPreviewWindow = async (path: string): Promise<void> =>
  await invoke("open_preview_window", { path });

// One of the app's on-disk data locations, with its recursively-summed size in bytes. `kind` is a
// stable id (see STORAGE_KIND) mapped to a localized label in the UI. Mirrors StorageLocation in
// functions/storage.rs.
export type AppStorageLocation = {
  kind: StorageKind;
  path: string;
  size: number;
};

// Where the app keeps its files on disk and how much space each location uses (config dir, cache
// dir). Only existing directories are returned; the walk runs off the UI thread in Rust.
export const getAppStorage = async (): Promise<AppStorageLocation[]> =>
  (await invoke("get_app_storage")) as AppStorageLocation[];

// Delete the app's cache directory (thumbnails and other regenerable files) to reclaim disk. Only
// the cache is cleared, never config/data; the dir is recreated lazily as things are cached again.
// Backs the "clear" button in the Storage settings panel.
export const clearAppCache = async (): Promise<void> =>
  await invoke("clear_app_cache");

// A saved SSH/SFTP connection. Secrets (password/passphrase) are never sent to the frontend — the
// backend strips them. Mirrors the Connection struct in filesystem/sftp.rs. See SSH_PLAN.md.
export type Connection = {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
};

// The saved SSH connections, surfaced as rows in the sidebar's Network group. Read from
// connections.toml in the config dir; empty when the file is absent.
export const sftpListConnections = async (): Promise<Connection[]> =>
  (await invoke("sftp_list_connections")) as Connection[];

// A connection being created from the GUI. Non-secret fields land in connections.toml; the optional
// secrets (password / key passphrase) are stored in the OS keychain by the backend, never the toml.
export type NewConnection = {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  keyPath?: string;
  keyPassphrase?: string;
  password?: string;
};

// Create (or replace by id) a connection. Secrets go to the OS keychain (see sftp.rs).
export const sftpAddConnection = async (
  connection: NewConnection,
): Promise<void> => await invoke("sftp_add_connection", { connection });

// Remove a saved connection and its keychain secrets.
export const sftpRemoveConnection = async (id: string): Promise<void> =>
  await invoke("sftp_remove_connection", { id });

// The connection's login directory as a `sftp://<id>/home` URL — where `ssh` lands. Used to open a
// connection on its home instead of the filesystem root. Connects on first call.
export const sftpHome = async (conn: string): Promise<string> =>
  (await invoke("sftp_home", { conn })) as string;

// Download a remote file to the local cache and return its local path. Read-only: local edits are
// not pushed back (phase 3a). Reuses a cached copy when the size matches.
export const sftpDownload = async (
  conn: string,
  path: string,
): Promise<string> => (await invoke("sftp_download", { conn, path })) as string;

// Make a path locally openable: a remote `sftp://<conn>/path` is downloaded to the cache and its
// local path returned; a local path passes through unchanged. Lets open/preview reuse the local
// flow for remote files.
export const materializePath = async (path: string): Promise<string> => {
  if (!path.startsWith(SFTP_SCHEME)) return path;
  const rest = path.slice(SFTP_SCHEME.length);
  const slash = rest.indexOf("/");
  const conn = slash === -1 ? rest : rest.slice(0, slash);
  const remote = slash === -1 ? "/" : rest.slice(slash);
  return sftpDownload(conn, remote);
};

// Mirror this window's live UI state (current path, view, tabs) to Rust so the headless control
// socket (`sfb ui get-state`) can report it without a round-trip to the webview. Called on every
// relevant change; `state` is a JSON string. Keyed by the calling window's label in Rust.
export const setUiState = async (state: string): Promise<void> =>
  await invoke("set_ui_state", { state });

// Whether this app is macOS's default handler for opening folders (Terminal `open`, folder links,
// aliases). Does NOT reflect double-clicking folders in Finder — that stays Finder. macOS only.
export const isDefaultFolderHandler = async (): Promise<boolean> =>
  (await invoke("is_default_folder_handler")) as boolean;

// Make this app the default folder handler (enable) or restore Finder (disable). macOS only.
export const setDefaultFolderHandler = async (enable: boolean): Promise<void> =>
  await invoke("set_default_folder_handler", { enable });
