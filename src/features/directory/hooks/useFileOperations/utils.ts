import { t } from "@/lang";

// File/folder name from a full path.
export const basename = (p: string) => p.split("/").pop() || p;

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
