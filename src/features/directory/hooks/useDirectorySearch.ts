import { useEffect, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { recentSearchesStore } from "@/shared/search/recentSearches";
import { DirEntry } from "@/shared/models";

// Wait this long after the last keystroke before hitting the (recursive, IO-bound) backend search.
const SEARCH_DEBOUNCE_MS = 300;

// Recursive search of the current folder, driven by the per-tab `search` query. Debounced; while a
// query is active the directory view shows these results instead of the folder's own entries. A
// query that settles with at least one result is recorded as a recent search.
export const useDirectorySearch = () => {
  const { fs, path, search } = useStateContext();
  const query = search.trim();
  const searchActive = query.length > 0;

  const [results, setResults] = useState<DirEntry[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchActive) return; // outputs are derived as empty below — no state to reset.

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      fs.searchDirectory(path, query)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setSearching(false);
          if (found.length) recentSearchesStore.add(query);
        })
        .catch((error) => {
          if (cancelled) return;
          setSearching(false);
          console.error("Search failed:\n" + error);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [fs, path, query, searchActive]);

  // When no query is active the directory shows its own entries, so report empty/idle here.
  return {
    searchActive,
    searching: searchActive && searching,
    results: searchActive ? results : [],
  };
};
