import { SORT_DIRECTION, SORT_KEY } from "@/features/directory/constants";

import type { Sort } from "../../sort";

// The fallback sort when a folder has no persisted preference yet.
export const DEFAULT_SORT: Sort = {
  key: SORT_KEY.NAME,
  direction: SORT_DIRECTION.ASC,
};

// Recents is ordered by most-recently-modified first by default — that's the whole point of the
// view. Still overridable: a sort the user picks there is persisted and wins on the next visit.
export const RECENTS_DEFAULT_SORT: Sort = {
  key: SORT_KEY.MODIFIED,
  direction: SORT_DIRECTION.DESC,
};
