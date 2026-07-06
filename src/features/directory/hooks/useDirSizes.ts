import { useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { DirEntry } from "@/shared/models";
import { SFTP_SCHEME } from "@/shared/constants";

import { dirSizeCache } from "./dirSizeCache";

// Bulk size-walking a remote folder would fire a recursive SFTP walk per subfolder (many network
// round trips) just from listing it — too heavy. Remote folder sizes are computed only on demand
// (the Properties panel via useEntrySize), so the bulk walk skips them entirely.
const isWalkable = (entry: DirEntry) =>
  entry.metadata.isDir && !entry.path.startsWith(SFTP_SCHEME);

// How many folder walks run at once. Each walk is already parallel (jwalk/rayon) and runs
// off the main thread, so a small pool overlaps IO latency without oversubscribing CPU/disk.
const CONCURRENCY = 4;

// Results are flushed to state in batches on this interval. Without batching, a large
// directory triggers one re-render per folder (e.g. 200 folders = 200 full re-renders of
// the list), which makes the grid/list switch janky.
const FLUSH_INTERVAL_MS = 120;

// Lazily compute recursive sizes for the directories in the current view. The OS reports
// directory size as 0, so we walk each folder in the background and return a path -> size
// map that fills in progressively without blocking the listing. Folders are processed by a
// small bounded pool of workers; the work is cancelled when the directory (or `enabled`)
// changes.
// `ignoresKey` is a stable string derived from the size-ignore patterns. When it changes the
// backend has recomputed under new rules and cleared its cache, so we drop our in-memory results
// and re-walk the current view rather than showing stale totals.
export const useDirSizes = (
  entries: DirEntry[],
  enabled: boolean,
  ignoresKey: string,
) => {
  const { fs } = useStateContext();
  const [sizes, setSizes] = useState<Record<string, number>>({});

  // Patterns changed: the cached sizes were measured under the old rules. Drop local state right
  // here (the React-sanctioned "reset state when a prop changes" render-phase pattern, tracking the
  // previous key in state) so nothing stale is shown; the shared module cache is cleared in an
  // effect below, and the walk then refills both.
  const [prevKey, setPrevKey] = useState(ignoresKey);
  if (prevKey !== ignoresKey) {
    setPrevKey(ignoresKey);
    setSizes({});
  }

  useEffect(() => {
    dirSizeCache.clear();
  }, [ignoresKey]);

  useEffect(() => {
    if (!enabled) return;

    const queue = entries.filter(isWalkable);
    if (!queue.length) return;

    let cancelled = false;

    // Buffer resolved sizes and flush them together on an interval, so a large directory
    // re-renders a handful of times instead of once per folder.
    let pending: Record<string, number> = {};
    let flushTimer: number | null = null;

    const flush = () => {
      flushTimer = null;
      if (cancelled || !Object.keys(pending).length) return;
      const batch = pending;
      pending = {};
      setSizes((prev) => ({ ...prev, ...batch }));
    };

    const scheduleFlush = () => {
      if (flushTimer === null)
        flushTimer = window.setTimeout(flush, FLUSH_INTERVAL_MS);
    };

    // Each worker pulls the next folder off the shared queue until it's drained.
    const worker = async () => {
      while (!cancelled) {
        const folder = queue.shift();
        if (!folder) return;
        try {
          const size = await fs.getDirSize(folder.path);
          dirSizeCache.set(folder.path, size);
          if (!cancelled) {
            pending[folder.path] = size;
            scheduleFlush();
          }
        } catch {
          // Folders we can't read still get recorded (as 0, an empty cell) so they count as
          // "resolved" — otherwise the computing indicator below would never clear.
          if (!cancelled) {
            pending[folder.path] = 0;
            scheduleFlush();
          }
        }
      }
    };

    const pool = Math.min(CONCURRENCY, queue.length);
    for (let i = 0; i < pool; i++) worker();

    return () => {
      cancelled = true;
      if (flushTimer !== null) window.clearTimeout(flushTimer);
    };
  }, [entries, enabled, fs, ignoresKey]);

  // Live updates: the size-index watcher (Phase B) emits dir-size-changed when a folder's recursive
  // size changes on disk, so the Size column updates without a re-walk. Only while the column is
  // shown (enabled); the backend watcher itself is driven by navigation in useDirectoryContents.
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    fs.onDirSizeChanged((change) => {
      dirSizeCache.set(change.path, change.size);
      setSizes((prev) => ({ ...prev, [change.path]: change.size }));
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [enabled, fs]);

  // Still computing while any visible folder has no size yet. Derived (no extra state) so it
  // flips off on its own as the batches land.
  const computing =
    enabled &&
    entries.some((entry) => isWalkable(entry) && sizes[entry.path] == null);

  return { sizes, computing };
};
