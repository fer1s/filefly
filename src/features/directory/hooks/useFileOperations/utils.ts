import { basename } from "@/shared/utils";
import { t } from "@/lang";

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

// The paths an operation produces in `destDir` (destDir/basename for each source), used by the
// clickable "jump to the file" toast. Names may differ on conflict-rename; reveal tolerates misses.
export const destPaths = (sources: string[], destDir: string) =>
  sources.map((src) => `${destDir}/${basename(src)}`);
