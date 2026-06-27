import { useEffect, useMemo, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import {
  ACCEPTED_PREVIEW_FORMATS,
  SORT_DIRECTION,
  SORT_KEY,
  VIEW_MODE,
  type SortKey,
  type ViewMode,
} from "@/shared/constants";
import * as api from "@/shared/services/api";
import { FEATURE_FLAGS } from "@/shared/featureFlags";
import { sortEntries, type Sort } from "../sort";
import { useDirSizes } from "./useDirSizes";

const DEFAULT_SORT: Sort = {
  key: SORT_KEY.NAME,
  direction: SORT_DIRECTION.ASC,
};

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
  const { dirContent, search, showHidden, path } = useStateContext();

  // Entries visible after applying the hidden-files toggle and the sidebar search filter.
  const filtered = useMemo(
    () =>
      dirContent.filter((e) => {
        if (!showHidden && e.name.startsWith(".")) return false;
        if (search && !e.name.toLowerCase().includes(search.toLowerCase()))
          return false;
        return true;
      }),
    [dirContent, search, showHidden],
  );

  // Column sort (driven by the list-view headers), loaded per folder from the config.
  const [sort, setSort] = useState<Sort>(DEFAULT_SORT);

  useEffect(() => {
    let cancelled = false;
    api.getFolderSort(path).then((saved) => {
      if (!cancelled) setSort(isValidSort(saved) ? saved : DEFAULT_SORT);
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
          ACCEPTED_PREVIEW_FORMATS.includes(
            (e.name.split(".").pop() || "").toLowerCase(),
          ),
      ),
    [sorted],
  );

  return { filtered, sorted, previewables, sort, handleSort, computingSizes };
};
