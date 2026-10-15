import { SORT_KEY } from "@/features/directory/constants";
import { t } from "@/lang";

// List columns shown in the header and the show/hide menu, in display order.
export const COLUMNS = [
  { key: SORT_KEY.NAME, label: t.directory.columns.name },
  { key: SORT_KEY.MODIFIED, label: t.directory.columns.modified },
  { key: SORT_KEY.CREATED, label: t.directory.columns.created },
  { key: SORT_KEY.SIZE, label: t.directory.columns.size },
  { key: SORT_KEY.KIND, label: t.directory.columns.kind },
] as const;

// Smallest width a column may reach while dragging a divider. The value is geometry in CSS pixels;
// the matching layout minimum lives in theme.css as --size-list-col-min.
export const LIST_COLUMN_MIN_WIDTH = 64;

export const LIST_COLUMN_RESIZE_CLASS = "list_column_resize";
export const LIST_COLUMN_RESIZE_SELECTOR = `.${LIST_COLUMN_RESIZE_CLASS}`;
