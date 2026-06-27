import type { RefObject } from "react";

import type { SortKey } from "@/shared/constants";
import type { Sort } from "../../sort";

export type ListHeaderProps = {
  sort: Sort;
  onSort: (key: SortKey) => void;
  visibleColumns: SortKey[];
  onToggleColumn: (key: SortKey) => void;
};

export type ColumnsMenuProps = {
  // Plain props (not read from a hook return inside this component) so passing the ref to the
  // forwarded `ref` doesn't trip the ref-during-render lint, mirroring EntryContextMenu.
  contextMenuRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
  visibleColumns: SortKey[];
  onToggleColumn: (key: SortKey) => void;
};
