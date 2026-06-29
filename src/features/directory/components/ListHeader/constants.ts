import { SORT_KEY } from "@/shared/constants";
import { t } from "@/lang";

// List columns shown in the header and the show/hide menu, in display order.
export const COLUMNS = [
  { key: SORT_KEY.NAME, label: t.directory.columns.name },
  { key: SORT_KEY.MODIFIED, label: t.directory.columns.modified },
  { key: SORT_KEY.CREATED, label: t.directory.columns.created },
  { key: SORT_KEY.SIZE, label: t.directory.columns.size },
  { key: SORT_KEY.KIND, label: t.directory.columns.kind },
] as const;
