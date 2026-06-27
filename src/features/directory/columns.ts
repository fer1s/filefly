import { SORT_KEY, type SortKey } from "@/shared/constants";

// List columns in display order. Header buttons and row cells follow this order, so the
// dynamic grid track list (built from the visible subset) stays aligned with both.
export const COLUMN_KEYS: SortKey[] = [
  SORT_KEY.NAME,
  SORT_KEY.MODIFIED,
  SORT_KEY.CREATED,
  SORT_KEY.SIZE,
  SORT_KEY.KIND,
];

// Grid track for each column, matching the original fixed --list-grid template.
export const COLUMN_TRACK: Record<SortKey, string> = {
  [SORT_KEY.NAME]: "minmax(0, 2.2fr)",
  [SORT_KEY.MODIFIED]: "minmax(110px, 1.4fr)",
  [SORT_KEY.CREATED]: "minmax(110px, 1.4fr)",
  [SORT_KEY.SIZE]: "90px",
  [SORT_KEY.KIND]: "100px",
};

// Canonicalise a column list: drop unknowns, force Name to always be present, and keep the
// fixed display order so it lines up with the rendered cells.
export const normalizeColumns = (cols: string[]): SortKey[] => {
  const wanted = new Set<string>(cols);
  wanted.add(SORT_KEY.NAME);
  return COLUMN_KEYS.filter((key) => wanted.has(key));
};

// Build the grid-template-columns value from the visible columns.
export const buildListGrid = (visible: SortKey[]): string =>
  visible.map((key) => COLUMN_TRACK[key]).join(" ");
