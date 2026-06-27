import { useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { DirEntry } from "@/shared/models";

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
export const useDirSizes = (entries: DirEntry[], enabled: boolean) => {
  const { fs } = useStateContext();
  const [sizes, setSizes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!enabled) return;

    const queue = entries.filter((entry) => entry.metadata.isDir);
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
  }, [entries, enabled, fs]);

  // Still computing while any visible folder has no size yet. Derived (no extra state) so it
  // flips off on its own as the batches land.
  const computing =
    enabled &&
    entries.some((entry) => entry.metadata.isDir && sizes[entry.path] == null);

  return { sizes, computing };
};
