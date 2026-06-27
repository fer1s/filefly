import { invoke } from "@tauri-apps/api/core";
import { watchImmediate } from "@tauri-apps/plugin-fs";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import { Volume, DirEntry } from "@/shared/models";
import { ACCESS_DENIED_ERROR } from "@/shared/constants";
import type { Keymap } from "@/shared/keymap/types";

export const getHostName = async (): Promise<string | null> =>
  await invoke("get_host_name");

// Load the keybindings (reads keymap.toml, falling back to bundled defaults).
export const getKeymap = async (): Promise<Keymap> =>
  (await invoke("get_keymap")) as Keymap;

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

// Get the user's disks (volumes)
export const getVolumes = async (): Promise<Volume[]> =>
  await invoke("get_volumes");

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

// Filesystem operations. These throw on error (the Rust command returns a Result) so callers can surface it.
export const copyEntry = async (
  source: string,
  destDir: string,
): Promise<void> => await invoke("copy_entry", { source, destDir });
export const moveEntry = async (
  source: string,
  destDir: string,
): Promise<void> => await invoke("move_entry", { source, destDir });
export const renameEntry = async (
  path: string,
  newName: string,
): Promise<void> => await invoke("rename_entry", { path, newName });
export const deleteEntry = async (path: string): Promise<void> =>
  await invoke("delete_entry", { path });

// Open the OS privacy settings (macOS Full Disk Access) so the user can grant access to
// protected folders like the Trash.
export const openFullDiskAccessSettings = async (): Promise<void> =>
  await invoke("open_full_disk_access_settings");

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
