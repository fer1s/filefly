import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import type { Tag } from "@/shared/models";

import { TagsContext } from "./TagsContext";
import type { TagsProviderProps } from "./types";

// App-level Finder-tag state: the per-file cache (for directory row dots + the picker) and the
// distinct-tags list (for the sidebar). Lives above both the directory and the sidebar — which are
// separate subtrees — so a tag written from the entry menu reactively updates both. macOS only at
// the backend; elsewhere every call resolves empty.
export const TagsProvider = ({ children }: TagsProviderProps) => {
  const { fs } = useStateContext();

  const [tags, setTags] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Mirror of `tags` for reads inside callbacks without depending on it; plus in-flight paths so
  // concurrent loaders don't double-fetch.
  const tagsRef = useRef(tags);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);
  const inflightRef = useRef<Set<string>>(new Set());

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

  const refreshAllTags = useCallback(async () => {
    setAllTags(await fs.listAllTags());
  }, [fs]);

  const setEntryTags = useCallback(
    async (path: string, value: Tag[]) => {
      await fs.setFileTags(path, value);
      setTags((prev) => ({ ...prev, [path]: value }));
      // Surface a brand-new tag in the sidebar immediately, without a full (slow) rescan. A tag
      // that became globally unused lingers until the next refreshAllTags — harmless.
      setAllTags((prev) => {
        const known = new Set(prev.map((tag) => tag.name));
        const added = value.filter((tag) => !known.has(tag.name));
        return added.length
          ? [...prev, ...added].sort((a, b) => a.color - b.color)
          : prev;
      });
    },
    [fs],
  );

  // Initial scan of the distinct tag list (and whenever the manager identity changes). Inlined
  // (rather than calling refreshAllTags) so the setState lands in an async callback, not the
  // effect body.
  useEffect(() => {
    let cancelled = false;
    fs.listAllTags().then((list) => {
      if (!cancelled) setAllTags(list);
    });
    return () => {
      cancelled = true;
    };
  }, [fs]);

  const value = useMemo(
    () => ({ tags, loadTags, setEntryTags, allTags, refreshAllTags }),
    [tags, loadTags, setEntryTags, allTags, refreshAllTags],
  );

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>;
};
