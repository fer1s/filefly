// Search-filter vocabulary and pure predicates. Kept in `shared` (not `features`) so the per-tab
// Tab model can reference `SearchFilters` without `shared` depending on a feature. The parts that
// need directory-specific knowledge (mapping an entry to a kind) live in features/directory/filters.

// Coarse file categories the search filter offers. `OTHER` catches anything uncategorised; folders
// are their own kind so "only folders" / "no folders" are expressible.
export const FILE_KIND = {
  FOLDER: "folder",
  IMAGE: "image",
  VIDEO: "video",
  AUDIO: "audio",
  DOCUMENT: "document",
  OTHER: "other",
} as const;
export type FileKind = (typeof FILE_KIND)[keyof typeof FILE_KIND];

export const DATE_RANGE = {
  ANY: "any",
  TODAY: "today",
  WEEK: "week",
  MONTH: "month",
} as const;
export type DateRange = (typeof DATE_RANGE)[keyof typeof DATE_RANGE];

export const SIZE_BUCKET = {
  ANY: "any",
  SMALL: "small",
  MEDIUM: "medium",
  LARGE: "large",
} as const;
export type SizeBucket = (typeof SIZE_BUCKET)[keyof typeof SIZE_BUCKET];

// Filters applied on top of a search result. `kinds` empty = all kinds; date/size "any" = no bound;
// `currentFolderOnly` restricts the (recursive) results to direct children of the searched folder.
export type SearchFilters = {
  kinds: FileKind[];
  date: DateRange;
  size: SizeBucket;
  currentFolderOnly: boolean;
};

export const DEFAULT_FILTERS: SearchFilters = {
  kinds: [],
  date: DATE_RANGE.ANY,
  size: SIZE_BUCKET.ANY,
  currentFolderOnly: false,
};

// Size-bucket boundaries in bytes: small < 1 MB, medium < 100 MB, large ≥ 100 MB.
const SMALL_MAX = 1024 * 1024;
const MEDIUM_MAX = 100 * 1024 * 1024;

export const sizeBucketOf = (size: number): SizeBucket => {
  if (size < SMALL_MAX) return SIZE_BUCKET.SMALL;
  if (size < MEDIUM_MAX) return SIZE_BUCKET.MEDIUM;
  return SIZE_BUCKET.LARGE;
};

// Earliest modified-time (secs since epoch) an entry may have to pass the date filter, given
// `nowSecs`. Approximate windows: today = last 24h, week = 7d, month = 30d.
export const dateFloor = (range: DateRange, nowSecs: number): number => {
  const DAY = 86400;
  switch (range) {
    case DATE_RANGE.TODAY:
      return nowSecs - DAY;
    case DATE_RANGE.WEEK:
      return nowSecs - 7 * DAY;
    case DATE_RANGE.MONTH:
      return nowSecs - 30 * DAY;
    default:
      return 0;
  }
};

// Whether any filter would actually narrow the results (drives the "active" badge on the button and
// lets callers skip the filtering pass entirely when nothing is set).
export const hasActiveFilters = (f: SearchFilters): boolean =>
  f.kinds.length > 0 ||
  f.date !== DATE_RANGE.ANY ||
  f.size !== SIZE_BUCKET.ANY ||
  f.currentFolderOnly;

// The number of filter categories currently constraining results — shown as a small count badge.
export const activeFilterCount = (f: SearchFilters): number =>
  (f.kinds.length > 0 ? 1 : 0) +
  (f.date !== DATE_RANGE.ANY ? 1 : 0) +
  (f.size !== SIZE_BUCKET.ANY ? 1 : 0) +
  (f.currentFolderOnly ? 1 : 0);

// Validate a persisted value as SearchFilters (defensive against corrupt/older localStorage).
export const isSearchFilters = (value: unknown): value is SearchFilters => {
  if (typeof value !== "object" || value === null) return false;
  const f = value as Record<string, unknown>;
  const kinds = Object.values(FILE_KIND) as string[];
  return (
    Array.isArray(f.kinds) &&
    f.kinds.every((k) => typeof k === "string" && kinds.includes(k)) &&
    (Object.values(DATE_RANGE) as string[]).includes(f.date as string) &&
    (Object.values(SIZE_BUCKET) as string[]).includes(f.size as string) &&
    typeof f.currentFolderOnly === "boolean"
  );
};
