import { basename, dirname } from "@/shared/utils";
import { t } from "@/lang";
import type { FileSystemManager } from "@/shared/managers/FileSystemManager";
import type { HistoryEntry } from "../useHistory";
import type { Transfer } from "./types";

// Replace the final segment of a path with `newName`, keeping its parent folder. Handles both
// "/" and "\" separators.
export const withName = (path: string, newName: string) => {
  const sep = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return path.slice(0, sep + 1) + newName;
};

// Human label for a batch of targets in toasts: the quoted name for one, or the item count.
export const entryLabel = (targets: string[]) =>
  targets.length === 1
    ? `"${basename(targets[0])}"`
    : t.directory.items(targets.length);

// Undo/redo for a move (paste-cut or drag-move): undo moves each item back to its original folder,
// redo moves it to the destination again. `dirname(from)`/`dirname(to)` recover those folders, and
// each op recaptures the real landing path so a conflict-rename can't desync a later cycle.
export const moveHistoryEntry = (
  fs: FileSystemManager,
  transfers: Transfer[],
  label: string,
): HistoryEntry => {
  const items = transfers.map((t) => ({
    home: dirname(t.from),
    dest: dirname(t.to),
    path: t.to,
  }));
  return {
    label,
    undo: async () => {
      for (const it of items) it.path = await fs.move(it.path, it.home);
    },
    redo: async () => {
      for (const it of items) it.path = await fs.move(it.path, it.dest);
    },
  };
};

// Undo/redo for a copy (paste-copy or drag-copy): undo trashes the created copies (reversible —
// they go to the Trash, not gone), redo re-copies the originals into `destDir`. Recaptures the new
// copy paths on redo so a repeated undo trashes the right ones.
export const copyHistoryEntry = (
  fs: FileSystemManager,
  transfers: Transfer[],
  destDir: string,
  label: string,
): HistoryEntry => {
  const sources = transfers.map((t) => t.from);
  let copies = transfers.map((t) => t.to);
  return {
    label,
    undo: async () => {
      for (const copy of copies) await fs.trash(copy);
    },
    redo: async () => {
      const next: string[] = [];
      for (const source of sources) next.push(await fs.copy(source, destDir));
      copies = next;
    },
  };
};

// Undo/redo for a trash (move-to-Trash): undo puts each item back via restoreTrashed, addressing
// it by its expected location in the system Trash (`trashDir/<name>`); redo trashes the restored
// items again. `trashDir` is the user's ~/.Trash — undo of the common case (item still there under
// its own name) works; a conflict-renamed or FDA-gated item simply isn't restored (caller toasts).
export const trashHistoryEntry = (
  fs: FileSystemManager,
  targets: string[],
  trashDir: string,
  label: string,
): HistoryEntry => {
  let inTrash = targets.map((target) => `${trashDir}/${basename(target)}`);
  let restored: string[] = [];
  return {
    label,
    undo: async () => {
      restored = [];
      for (const path of inTrash) {
        const dest = await fs.restoreTrashed(path);
        if (dest) restored.push(dest);
      }
    },
    redo: async () => {
      for (const path of restored) await fs.trash(path);
      inTrash = restored.map((path) => `${trashDir}/${basename(path)}`);
    },
  };
};

// Undo/redo for a rename: swap the item's name between its old and new value in the same folder.
export const renameHistoryEntry = (
  fs: FileSystemManager,
  dir: string,
  oldName: string,
  newName: string,
  label: string,
): HistoryEntry => ({
  label,
  undo: async () => {
    await fs.rename(`${dir}/${newName}`, oldName);
  },
  redo: async () => {
    await fs.rename(`${dir}/${oldName}`, newName);
  },
});
