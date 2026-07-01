import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { SORT_KEY } from "@/features/directory/constants";

import { faCheck } from "@fortawesome/free-solid-svg-icons";

import { COLUMNS } from "./constants";
import type { ColumnsMenuProps } from "./types";

// Show/hide menu for the list columns. A check marks visible columns; Name is mandatory
// (shown disabled). Kept presentational — its props come from the parent's useContextMenu.
const ColumnsMenu = ({
  contextMenuRef,
  visible,
  visibleColumns,
  onToggleColumn,
}: ColumnsMenuProps) => (
  <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
    {COLUMNS.map((col) => {
      const isName = col.key === SORT_KEY.NAME;
      const isVisible = visibleColumns.includes(col.key);
      return (
        <ContextMenuItem
          key={col.key}
          text={col.label}
          icon={isVisible ? <Icon icon={faCheck} /> : undefined}
          onClick={isName ? undefined : () => onToggleColumn(col.key)}
          disabled={isName}
        />
      );
    })}
  </ContextMenu>
);

export default ColumnsMenu;
