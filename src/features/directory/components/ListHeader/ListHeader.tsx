import type { MouseEvent } from "react";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { ENTRY_KIND, SORT_DIRECTION } from "@/features/directory/constants";

import { useContextMenu } from "../../hooks/useContextMenu";

import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import ColumnsMenu from "./ColumnsMenu";
import {
  COLUMNS,
  LIST_COLUMN_RESIZE_CLASS,
  LIST_COLUMN_RESIZE_SELECTOR,
} from "./constants";
import { useColumnResize } from "./useColumnResize";
import type { ListHeaderProps } from "./types";

// Sortable column headers for the list view. Clicking a column sorts by it; the active column
// shows a direction chevron. Right-clicking the header opens a menu to show/hide columns.
const ListHeader = ({
  sort,
  onSort,
  visibleColumns,
  onToggleColumn,
  onColumnWidthsChange,
}: ListHeaderProps) => {
  const menu = useContextMenu();
  const { headerRef, bindResize, resizing } = useColumnResize(
    visibleColumns,
    onColumnWidthsChange,
  );

  const openMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    menu.openAt(e.clientX, e.clientY, "", ENTRY_KIND.NONE);
  };

  return (
    <>
      <div
        ref={headerRef}
        className={classNames("list_header", resizing && "resizing")}
        onContextMenu={openMenu}
      >
        {COLUMNS.map((col) => {
          const visibleIndex = visibleColumns.indexOf(col.key);
          const resizable =
            visibleIndex >= 0 && visibleIndex < visibleColumns.length - 1;
          return (
            <Button
              key={col.key}
              unstyled
              data-column={col.key}
              className={classNames(col.key, sort.key === col.key && "active")}
              onClick={(event) => {
                if (
                  (event.target as HTMLElement).closest(
                    LIST_COLUMN_RESIZE_SELECTOR,
                  )
                )
                  return;
                onSort(col.key);
              }}
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
              {resizable && (
                <span
                  className={LIST_COLUMN_RESIZE_CLASS}
                  aria-hidden="true"
                  {...bindResize(col.key)}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                />
              )}
            </Button>
          );
        })}
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
