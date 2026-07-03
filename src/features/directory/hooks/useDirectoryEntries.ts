import { useEffect, useMemo, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { RECENTS, VIEW_MODE, type ViewMode } from "@/shared/constants";
import {
  ACCEPTED_PREVIEW_FORMATS,
  SORT_DIRECTION,
  SORT_KEY,
  type SortKey,
} from "@/features/directory/constants";
import * as api from "@/shared/services/api";
import { extension } from "@/shared/utils";
import { FEATURE_FLAGS } from "@/shared/featureFlags";
import { hasActiveFilters } from "@/shared/search/filters";
import { sortEntries, type Sort } from "../sort";
import { applyFilters } from "../filters";
import { useDirSizes } from "./useDirSizes";
import { useDirectorySearch } from "./useDirectorySearch";

const DEFAULT_SORT: Sort = {
  key: SORT_KEY.NAME,
  direction: SORT_DIRECTION.ASC,
};

// Recents is ordered by most-recently-modified first by default — that's the whole point of the
// view. Still overridable: a sort the user picks there is persisted and wins on the next visit.
const RECENTS_DEFAULT_SORT: Sort = {
  key: SORT_KEY.MODIFIED,
  direction: SORT_DIRECTION.DESC,
};

// The fallback sort when a folder has no persisted preference yet.
const defaultSortFor = (path: string): Sort =>
  path === RECENTS ? RECENTS_DEFAULT_SORT : DEFAULT_SORT;

// Whether a persisted sort (loaded from the folder config) is a recognised key/direction.
const isValidSort = (
  saved: { key: string; direction: string } | null,
): saved is Sort =>
  !!saved &&
  (Object.values(SORT_KEY) as string[]).includes(saved.key) &&
  (Object.values(SORT_DIRECTION) as string[]).includes(saved.direction);

// Owns the visible entry list: search filter, column sort, lazily computed folder
// sizes, and the previewable subset (for prev/next navigation).
export const useDirectoryEntries = (view: ViewMode) => {
  const { dirContent, showHidden, path, filters } = useStateContext();

  // While a search is active, the recursive results replace the folder's own entries (the
  // directory content is hidden in favor of the results); otherwise show the folder as usual.
  const { searchActive, searching, results } = useDirectorySearch();

  // Apply the search filters (kind/date/size/scope) to the results. Only meaningful while
  // searching; the raw folder listing is shown unfiltered.
  const filteredResults = useMemo(() => {
    if (!searchActive || !hasActiveFilters(filters)) return results;
    return applyFilters(results, filters, path, Math.floor(Date.now() / 1000));
  }, [searchActive, results, filters, path]);

  const base = searchActive ? filteredResults : dirContent;

  // Entries visible after applying the hidden-files toggle. (Search matching is done by the
  // backend, so no name filter is needed here.)
  const filtered = useMemo(
    () => base.filter((e) => showHidden || !e.name.startsWith(".")),
    [base, showHidden],
  );

  // Column sort (driven by the list-view headers), loaded per folder from the config.
  const [sort, setSort] = useState<Sort>(() => defaultSortFor(path));

  useEffect(() => {
    let cancelled = false;
    api.getFolderSort(path).then((saved) => {
      if (!cancelled)
        setSort(isValidSort(saved) ? saved : defaultSortFor(path));
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  // Lazily computed directory sizes (the OS reports 0 for folders). Gated behind a
  // feature flag (off by default) since walking every folder is costly on large dirs.
  const { sizes: dirSizes, computing: computingSizes } = useDirSizes(
    filtered,
    FEATURE_FLAGS.directorySizes && view === VIEW_MODE.LIST,
  );

  // Fill in the computed size for folders so it shows and sorts like file sizes.
  const withSizes = useMemo(
    () =>
      filtered.map((entry) =>
        entry.metadata.isDir && dirSizes[entry.path] != null
          ? { ...entry, size: dirSizes[entry.path] }
          : entry,
      ),
    [filtered, dirSizes],
  );

  const sorted = useMemo(() => sortEntries(withSizes, sort), [withSizes, sort]);

  // Click a header: toggle direction if it's the active column, else sort asc by it. The new
  // sort is persisted for this folder.
  const handleSort = (key: SortKey) => {
    const next: Sort =
      sort.key === key
        ? {
            key,
            direction:
              sort.direction === SORT_DIRECTION.ASC
                ? SORT_DIRECTION.DESC
                : SORT_DIRECTION.ASC,
          }
        : { key, direction: SORT_DIRECTION.ASC };
    setSort(next);
    api.setFolderSort(path, next.key, next.direction).catch((err) => {
      console.error("Failed to persist sort preference:\n" + err);
    });
  };

  const previewables = useMemo(
    () =>
      sorted.filter(
        (e) =>
          e.metadata.isFile &&
          ACCEPTED_PREVIEW_FORMATS.includes(extension(e.name)),
      ),
    [sorted],
  );

  return {
    filtered,
    sorted,
    previewables,
    sort,
    handleSort,
    computingSizes,
    searchActive,
    searching,
  };
};
