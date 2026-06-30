import { useCallback, useEffect, useRef, useState } from "react";

import type { Tag } from "@/shared/models";
import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

// Finder-tag state for the directory: a path→tags cache plus lazy loading and writes. Owned by
// DirectoryProvider and consumed (via useDirectory) by both the entry rows and the context-menu
// picker, so a tag change from the menu reflects in the rows without a directory refresh (xattr
// changes don't fire the fs watcher reliably anyway).
export const useTags = (fs: FileSystemManager) => {
  const [tags, setTags] = useState<Record<string, Tag[]>>({});

  // Mirror of `tags` for reads inside callbacks without making them depend on it; plus the set of
  // in-flight paths so concurrent callers don't double-fetch.
  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  const inflightRef = useRef<Set<string>>(new Set());

  // Load tags for paths not cached yet (lazy). De-duped against cache + in-flight.
  const loadTags = useCallback(
    async (paths: string[]) => {
      const missing = paths.filter(
        (path) => !(path in tagsRef.current) && !inflightRef.current.has(path),
      );
      if (!missing.length) return;

      missing.forEach((path) => inflightRef.current.add(path));
      try {
        const loaded = await fs.getFileTags(missing);
        setTags((prev) => {
          const next = { ...prev };
          missing.forEach((path) => {
            next[path] = loaded[path] ?? [];
          });
          return next;
        });
      } finally {
        missing.forEach((path) => inflightRef.current.delete(path));
      }
    },
    [fs],
  );

  // Persist a file's tags and update the cache so its row reflects the change immediately.
  const setEntryTags = useCallback(
    async (path: string, value: Tag[]) => {
      await fs.setFileTags(path, value);
      setTags((prev) => ({ ...prev, [path]: value }));
    },
    [fs],
  );

  return { tags, loadTags, setEntryTags };
};
