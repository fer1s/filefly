import type { ReactNode } from "react";

import type { Tag } from "@/shared/models";

export type TagsContextValue = {
  // Per-path tag cache (lazy). Empty array = loaded, no tags.
  tags: Record<string, Tag[]>;
  // Load tags for the given paths if not cached yet (de-duped).
  loadTags: (paths: string[]) => Promise<void>;
  // Persist a file's tags and update the cache (and surface any new tag in `allTags`).
  setEntryTags: (path: string, value: Tag[]) => Promise<void>;
  // Distinct tags in use across the system, for the sidebar list.
  allTags: Tag[];
  // Re-scan the distinct tag list (e.g. after deletions, which optimistic updates can't detect).
  refreshAllTags: () => Promise<void>;
};

export type TagsProviderProps = {
  children: ReactNode;
};
