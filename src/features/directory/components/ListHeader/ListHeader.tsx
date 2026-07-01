import type { MouseEvent } from "react";

import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { ENTRY_KIND, SORT_DIRECTION } from "@/features/directory/constants";

import { useContextMenu } from "../../hooks/useContextMenu";

import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import ColumnsMenu from "./ColumnsMenu";
import { COLUMNS } from "./constants";
import type { ListHeaderProps } from "./types";

// Sortable column headers for the list view. Clicking a column sorts by it; the active column
// shows a direction chevron. Right-clicking the header opens a menu to show/hide columns.
const ListHeader = ({
  sort,
  onSort,
  visibleColumns,
  onToggleColumn,
}: ListHeaderProps) => {
  const menu = useContextMenu();

  const openMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    menu.openAt(e.clientX, e.clientY, "", ENTRY_KIND.NONE);
  };

  return (
    <>
      <div className="list_header" onContextMenu={openMenu}>
        {COLUMNS.map((col) => (
          <button
            key={col.key}
            type="button"
            className={classNames(col.key, sort.key === col.key && "active")}
            onClick={() => onSort(col.key)}
          >
            <span>{col.label}</span>
            {sort.key === col.key && (
              <Icon
                icon={
                  sort.direction === SORT_DIRECTION.ASC
                    ? faChevronUp
                    : faChevronDown
                }
              />
            )}
          </button>
        ))}
      </div>

      <ColumnsMenu
        contextMenuRef={menu.ref}
        visible={menu.visible}
        visibleColumns={visibleColumns}
        onToggleColumn={onToggleColumn}
      />
    </>
  );
};

export default ListHeader;
