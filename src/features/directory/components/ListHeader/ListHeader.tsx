import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { SORT_DIRECTION, SORT_KEY } from "@/shared/constants";
import { t } from "@/lang";

import { faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons";

import type { ListHeaderProps } from "./types";

const COLUMNS = [
  { key: SORT_KEY.NAME, label: t.directory.columns.name },
  { key: SORT_KEY.MODIFIED, label: t.directory.columns.modified },
  { key: SORT_KEY.CREATED, label: t.directory.columns.created },
  { key: SORT_KEY.SIZE, label: t.directory.columns.size },
  { key: SORT_KEY.KIND, label: t.directory.columns.kind },
] as const;

// Sortable column headers for the list view. Clicking a column sorts by it; the active
// column shows a direction chevron.
const ListHeader = ({ sort, onSort }: ListHeaderProps) => (
  <div className="list_header">
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
);

export default ListHeader;
