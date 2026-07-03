import { RECENTS } from "@/shared/constants";
import { SORT_DIRECTION, SORT_KEY } from "@/features/directory/constants";

import type { Sort } from "../../sort";
import { DEFAULT_SORT, RECENTS_DEFAULT_SORT } from "./constants";

// The fallback sort for a folder: Recents defaults to most-recent-first, everything else to the
// generic default (see the constants).
export const defaultSortFor = (path: string): Sort =>
  path === RECENTS ? RECENTS_DEFAULT_SORT : DEFAULT_SORT;

// Whether a persisted sort (loaded from the folder config) is a recognised key/direction.
export const isValidSort = (
  saved: { key: string; direction: string } | null,
): saved is Sort =>
  !!saved &&
  (Object.values(SORT_KEY) as string[]).includes(saved.key) &&
  (Object.values(SORT_DIRECTION) as string[]).includes(saved.direction);
