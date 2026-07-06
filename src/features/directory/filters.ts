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
import {
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  MARKDOWN_FORMATS,
  PDF_FORMAT,
} from "@/features/directory/constants";

// Document extensions treated as the "document" kind (PDF + text/markdown + common office docs).
const DOCUMENT_FORMATS = [
  PDF_FORMAT,
  ...MARKDOWN_FORMATS,
  "txt",
  "rtf",
  "doc",
  "docx",
  "pages",
  "odt",
];

// Map an entry to one of the coarse filter kinds by its extension (or folder-ness).
export const kindOf = (entry: DirEntry): FileKind => {
  if (entry.metadata.isDir) return FILE_KIND.FOLDER;
  const ext = extension(entry.name);
  if (IMAGE_FORMATS.includes(ext)) return FILE_KIND.IMAGE;
  if (VIDEO_FORMATS.includes(ext)) return FILE_KIND.VIDEO;
  if (AUDIO_FORMATS.includes(ext)) return FILE_KIND.AUDIO;
  if (DOCUMENT_FORMATS.includes(ext)) return FILE_KIND.DOCUMENT;
  return FILE_KIND.OTHER;
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
