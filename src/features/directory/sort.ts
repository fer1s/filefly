import {
  SORT_DIRECTION,
  SORT_KEY,
  type SortDirection,
  type SortKey,
} from "@/features/directory/constants";
import { extension } from "@/shared/utils";
import { DirEntry } from "@/shared/models";

export type Sort = { key: SortKey; direction: SortDirection };

// Value used to order by the "Kind" column: directories group first (empty),
// then files by their extension.
const kindValue = (entry: DirEntry) =>
  entry.metadata.isDir
    ? ""
    : entry.name.startsWith(".") || !entry.name.includes(".")
      ? ""
      : extension(entry.name);

const byName = (a: DirEntry, b: DirEntry) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

// Return a new array sorted by the given column and direction. Ties fall back
// to name so the order is always stable.
export const sortEntries = (entries: DirEntry[], sort: Sort): DirEntry[] => {
  const sorted = [...entries].sort((a, b) => {
    let result = 0;

    switch (sort.key) {
      case SORT_KEY.NAME:
        result = byName(a, b);
        break;
      case SORT_KEY.MODIFIED:
        result =
          a.metadata.modified.secs_since_epoch -
          b.metadata.modified.secs_since_epoch;
        break;
      case SORT_KEY.CREATED:
        result =
          a.metadata.created.secs_since_epoch -
          b.metadata.created.secs_since_epoch;
        break;
      case SORT_KEY.SIZE:
        result = a.size - b.size;
        break;
      case SORT_KEY.KIND:
        result = kindValue(a).localeCompare(kindValue(b));
        break;
    }

    if (result === 0) result = byName(a, b);

    return sort.direction === SORT_DIRECTION.ASC ? result : -result;
  });

  return sorted;
};
