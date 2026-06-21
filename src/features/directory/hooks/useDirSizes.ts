import { useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { DirEntry } from "@/shared/models";

// How many folder walks run at once. Each walk is already parallel (jwalk/rayon) and runs
// off the main thread, so a small pool overlaps IO latency without oversubscribing CPU/disk.
const CONCURRENCY = 4;

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

    // Each worker pulls the next folder off the shared queue until it's drained.
    const worker = async () => {
      while (!cancelled) {
        const folder = queue.shift();
        if (!folder) return;
        try {
          const size = await fs.getDirSize(folder.path);
          if (!cancelled)
            setSizes((prev) => ({ ...prev, [folder.path]: size }));
        } catch {
          // Ignore folders we can't read; they just keep an empty size cell.
        }
      }
    };

    const pool = Math.min(CONCURRENCY, queue.length);
    for (let i = 0; i < pool; i++) worker();

    return () => {
      cancelled = true;
    };
  }, [entries, enabled, fs]);

  return sizes;
};
