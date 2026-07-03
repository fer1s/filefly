import { faSort } from "@fortawesome/free-solid-svg-icons";

import { SORT_DIRECTION, SORT_KEY } from "@/features/directory/constants";
import { t } from "@/lang";

import { ENTRY_ACTION } from "./constants";
import type { EntryAction, EntryActionSubItem } from "./types";

// Sort keys shown in the submenu, in the same order as the list-view column headers.
const SORT_KEYS = [
  { key: SORT_KEY.NAME, label: () => t.directory.columns.name },
  { key: SORT_KEY.MODIFIED, label: () => t.directory.columns.modified },
  { key: SORT_KEY.CREATED, label: () => t.directory.columns.created },
  { key: SORT_KEY.SIZE, label: () => t.directory.columns.size },
  { key: SORT_KEY.KIND, label: () => t.directory.columns.kind },
] as const;

// Per-folder sort picker. Opens a submenu of sort keys plus the direction toggle; the active
// key/direction is checked. Choosing a key sorts by it (or flips direction if already active);
// onSort persists the choice for this folder (see useDirectoryEntries.handleSort).
export const sortByAction: EntryAction = {
  id: ENTRY_ACTION.SORT_BY,
  label: () => t.contextMenu.sortBy,
  icon: faSort,
  submenu: ({ sort, onSort }): EntryActionSubItem[] => {
    const keys: EntryActionSubItem[] = SORT_KEYS.map(({ key, label }) => ({
      key,
      label: label(),
      checked: sort.key === key,
      onClick: () => onSort(key),
    }));
    // A second click on the active key flips direction (handleSort's toggle), so the direction
    // rows re-sort by the current key toward the chosen direction.
    return [
      ...keys,
      { key: "separator", label: "", isSeparator: true },
      {
        key: SORT_DIRECTION.ASC,
        label: t.contextMenu.sortAscending,
        checked: sort.direction === SORT_DIRECTION.ASC,
        onClick: () => {
          if (sort.direction !== SORT_DIRECTION.ASC) onSort(sort.key);
        },
      },
      {
        key: SORT_DIRECTION.DESC,
        label: t.contextMenu.sortDescending,
        checked: sort.direction === SORT_DIRECTION.DESC,
        onClick: () => {
          if (sort.direction !== SORT_DIRECTION.DESC) onSort(sort.key);
        },
      },
    ];
  },
};
