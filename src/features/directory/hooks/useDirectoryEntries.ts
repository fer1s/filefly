import { useMemo, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import {
  ACCEPTED_PREVIEW_FORMATS,
  SORT_DIRECTION,
  SORT_KEY,
  VIEW_MODE,
  type SortKey,
  type ViewMode,
} from "@/shared/constants";
import { sortEntries, type Sort } from "../sort";
import { useDirSizes } from "./useDirSizes";

// Owns the visible entry list: search filter, column sort, lazily computed folder
// sizes, and the previewable subset (for prev/next navigation).
export const useDirectoryEntries = (view: ViewMode) => {
  const { dirContent, search } = useStateContext();

  // Entries visible after applying the sidebar search filter.
  const filtered = useMemo(
    () =>
      search
        ? dirContent.filter((e) =>
            e.name.toLowerCase().includes(search.toLowerCase()),
          )
        : dirContent,
    [dirContent, search],
  );

  // Column sort (driven by the list-view headers).
  const [sort, setSort] = useState<Sort>({
    key: SORT_KEY.NAME,
    direction: SORT_DIRECTION.ASC,
  });

  // Lazily computed directory sizes (the OS reports 0 for folders).
  const dirSizes = useDirSizes(filtered, view === VIEW_MODE.LIST);

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

  // Click a header: toggle direction if it's the active column, else sort asc by it.
  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? {
            key,
            direction:
              prev.direction === SORT_DIRECTION.ASC
                ? SORT_DIRECTION.DESC
                : SORT_DIRECTION.ASC,
          }
        : { key, direction: SORT_DIRECTION.ASC },
    );

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

  return { filtered, sorted, previewables, sort, handleSort };
};
