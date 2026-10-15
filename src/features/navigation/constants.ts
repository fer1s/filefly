import { faList, faTableCellsLarge } from "@fortawesome/free-solid-svg-icons";

import { VIEW_MODE } from "@/shared/constants";
import { t } from "@/lang";

export const VIEW_OPTIONS = [
  { value: VIEW_MODE.LIST, icon: faList, label: () => t.pathbar.listView },
  {
    value: VIEW_MODE.GRID,
    icon: faTableCellsLarge,
    label: () => t.pathbar.gridView,
  },
] as const;
