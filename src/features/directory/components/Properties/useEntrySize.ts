import { useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { DirEntry } from "@/shared/models";

import { dirSizeCache } from "../../hooks/dirSizeCache";

// Size to display for an entry. Files report it directly; folders have no stored size (the OS
// reports 0), so we compute the recursive total on demand — returning null while it's being
// calculated. Only ever runs for the single selected entry (Properties / info panel), so it's a
// one-off walk, not the whole listing.
export const useEntrySize = (entry: DirEntry): number | null => {
  const { fs } = useStateContext();
  // Tag the result with its path so a stale folder's size never shows for a newly selected one
  // (and so we don't need a synchronous reset-to-null in the effect body).
  const [computed, setComputed] = useState<{
    path: string;
    size: number;
  } | null>(null);

  useEffect(() => {
    if (!entry.metadata.isDir) return;
    let cancelled = false;
    fs.getDirSize(entry.path)
      .then((size) => {
        dirSizeCache.set(entry.path, size);
        if (!cancelled) setComputed({ path: entry.path, size });
      })
      .catch(() => !cancelled && setComputed({ path: entry.path, size: 0 }));
    return () => {
      cancelled = true;
    };
  }, [fs, entry.path, entry.metadata.isDir]);

  if (!entry.metadata.isDir) return entry.size;
  // Fresh result wins; otherwise show the cached value instantly (the list usually measured it
  // already) while the effect recomputes; null only when we've never measured this folder.
  if (computed?.path === entry.path) return computed.size;
  return dirSizeCache.get(entry.path) ?? null;
};
