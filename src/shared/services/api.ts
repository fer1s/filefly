import { invoke } from "@tauri-apps/api/core";

import { notify } from "@/shared/toast";
import { t } from "@/lang";
import { Volume, DirEntry } from "@/shared/models";

// Get the user's disks (volumes)
export const getVolumes = async (): Promise<Volume[]> =>
  await invoke("get_volumes");

// Read directory invokement method
export const readDirectory = async (path: string): Promise<DirEntry[]> =>
  (await invokeWithPathArg("read_directory", path)) as DirEntry[];

// Open a file with the OS default application. Goes through the Rust `open_file` command so the path
// is logged to the Tauri terminal; the command returns the error if it fails.
export const openFile = async (path: string): Promise<void> => {
  try {
    await invoke("open_file", { path });
  } catch (err) {
    notify(t.errors.open(String(err)), "error");
  }
};

// Open in terminal invokement method
export const openInTerminal = async (path: string): Promise<void> =>
  (await invokeWithPathArg("open_in_terminal", path)) as void;

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

// Helper function to invoke methods with a path argument
const invokeWithPathArg = async (
  method: "open_in_terminal" | "read_directory" | "open_file" | "md_to_html",
  path: string,
): Promise<DirEntry[] | void | string> =>
  await invoke(method, { path: path })
    .then((value) => value as void | DirEntry[])
    .catch((err) => {
      console.error("Path is either not valid or does not exist:\n" + err);
      if (method != "read_directory") return;
      return [];
    });
