import { createContext, useContext } from "react";

import type { TagsContextValue } from "./types";

export const TagsContext = createContext<TagsContextValue>({
  tags: {},
  loadTags: async () => {},
  setEntryTags: async () => {},
  allTags: [],
  refreshAllTags: async () => {},
});

export const useTags = () => useContext(TagsContext);
