import type { DirEntry } from "@/shared/models";

type CachedDirSize = {
  size: number;
  modified?: number;
  ignoresKey?: string;
};

// In-memory companion to the persistent SQLite size index. Besides the size, keep the directory
// mtime and ignore-rules key that produced it so revisiting an unchanged folder in this session can
// skip the IPC/cache lookup without reusing a result measured under different conditions.
const dirSizeCache = new Map<string, CachedDirSize>();

export const getCachedDirSize = (path: string): number | undefined =>
  dirSizeCache.get(path)?.size;

export const getFreshCachedDirSize = (
  entry: DirEntry,
  ignoresKey: string,
): number | undefined => {
  const cached = dirSizeCache.get(entry.path);
  if (
    !cached ||
    cached.modified !== entry.metadata.modified.secs_since_epoch ||
    cached.ignoresKey !== ignoresKey
  )
    return undefined;
  return cached.size;
};

export const setCachedDirSize = (
  entry: DirEntry,
  size: number,
  ignoresKey?: string,
) => {
  const previous = dirSizeCache.get(entry.path);
  dirSizeCache.set(entry.path, {
    size,
    modified: entry.metadata.modified.secs_since_epoch,
    ignoresKey: ignoresKey ?? previous?.ignoresKey,
  });
};

// Watcher results are authoritative for the size, but retain the validation metadata. If a direct
// directory change also advances its mtime, the next listing will naturally revalidate it.
export const setLiveCachedDirSize = (path: string, size: number) => {
  const previous = dirSizeCache.get(path);
  dirSizeCache.set(path, previous ? { ...previous, size } : { size });
};

export const clearDirSizeCache = () => dirSizeCache.clear();
