import { extension, dirname } from "@/shared/utils";
import { DirEntry } from "@/shared/models";
import {
  FILE_KIND,
  DATE_RANGE,
  SIZE_BUCKET,
  dateFloor,
  sizeBucketOf,
  hasActiveFilters,
  type FileKind,
  type SearchFilters,
} from "@/shared/search/filters";
import { FILE_CATEGORY, type FileCategory } from "@/shared/constants";

import { getFileTypeExtensions, categoryOf } from "./formats";

// Coarse search-filter kind per file-type category. Categories the user can remap (Settings ›
// File types) feed this, so a custom extension filters like the category it was put in.
// Categories absent from this map fall through to FILE_KIND.OTHER.
const KIND_BY_CATEGORY: Partial<Record<FileCategory, FileKind>> = {
  [FILE_CATEGORY.IMAGE]: FILE_KIND.IMAGE,
  [FILE_CATEGORY.VIDEO]: FILE_KIND.VIDEO,
  [FILE_CATEGORY.AUDIO]: FILE_KIND.AUDIO,
  [FILE_CATEGORY.PDF]: FILE_KIND.DOCUMENT,
  [FILE_CATEGORY.MARKDOWN]: FILE_KIND.DOCUMENT,
  [FILE_CATEGORY.TEXT]: FILE_KIND.DOCUMENT,
  [FILE_CATEGORY.WORD]: FILE_KIND.DOCUMENT,
};

// Map an entry to one of the coarse filter kinds by its extension (or folder-ness). Reads the
// live category map from the store: filtering runs outside React (search results pipeline).
export const kindOf = (entry: DirEntry): FileKind => {
  if (entry.metadata.isDir) return FILE_KIND.FOLDER;
  const category = categoryOf(getFileTypeExtensions(), extension(entry.name));
  return (category && KIND_BY_CATEGORY[category]) ?? FILE_KIND.OTHER;
};

// Apply the filters to a list of entries (typically recursive search results). `currentPath` is the
// searched folder, used by the "only current folder" toggle. `nowSecs` is passed in (not read from
// the clock here) so the function is pure and testable.
export const applyFilters = (
  entries: DirEntry[],
  filters: SearchFilters,
  currentPath: string,
  nowSecs: number,
): DirEntry[] => {
  if (!hasActiveFilters(filters)) return entries;

  const floor = dateFloor(filters.date, nowSecs);

  return entries.filter((entry) => {
    if (filters.kinds.length > 0 && !filters.kinds.includes(kindOf(entry)))
      return false;
    if (
      filters.date !== DATE_RANGE.ANY &&
      entry.metadata.modified.secs_since_epoch < floor
    )
      return false;
    if (
      filters.size !== SIZE_BUCKET.ANY &&
      !entry.metadata.isDir &&
      sizeBucketOf(entry.size) !== filters.size
    )
      return false;
    if (filters.currentFolderOnly && dirname(entry.path) !== currentPath)
      return false;
    return true;
  });
};
