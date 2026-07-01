import Icon from "@/shared/components/elements/Icon";
import IconButton, {
  ICON_BUTTON_SIZE,
} from "@/shared/components/elements/IconButton";
import Tooltip, {
  TOOLTIP_PLACEMENT,
} from "@/shared/components/elements/Tooltip";
import { classNames, activateOnKey } from "@/shared/utils";
import { t } from "@/lang";

import { faTrash, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

import type { FolderItemProps } from "./types";

const FolderItem = ({
  item,
  setPath,
  collapsed,
  active,
  hotkey,
  onContextMenu,
  onRemove,
  onToggleHidden,
  hidden,
  className,
}: FolderItemProps) => {
  const open = () => setPath(item.path);

  const row = (
    <div
      className={classNames(
        "folder_item",
        active && "active",
        hidden && "hidden",
        className,
      )}
      role="button"
      tabIndex={0}
      aria-current={active ? "true" : undefined}
      aria-label={item.name}
      onClick={open}
      onKeyDown={activateOnKey(open)}
      onContextMenu={onContextMenu}
    >
      <Icon icon={item.icon} />
      <p>{item.name}</p>
      {/* In edit mode the row shows an action button (eye/trash) on the right; hide the hotkey
          badge then so they don't crowd each other. */}
      {hotkey && !onRemove && !onToggleHidden && (
        <span className="folder_hotkey">{hotkey}</span>
      )}
      {onRemove && (
        <IconButton
          icon={faTrash}
          size={ICON_BUTTON_SIZE.SM}
          className="item_remove"
          tooltip={t.sidebar.removeItem}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t.sidebar.removeItem}
        />
      )}
      {onToggleHidden && (
        <IconButton
          icon={hidden ? faEyeSlash : faEye}
          size={ICON_BUTTON_SIZE.SM}
          className="item_hide"
          tooltip={hidden ? t.sidebar.showPreset : t.sidebar.hidePreset}
          tooltipPlacement={TOOLTIP_PLACEMENT.RIGHT}
          onClick={(e) => {
            e.stopPropagation();
            onToggleHidden();
          }}
          aria-label={hidden ? t.sidebar.showPreset : t.sidebar.hidePreset}
        />
      )}
    </div>
  );

  // Collapsed: the label/hotkey are hidden in the rail, so surface them in our tooltip.
  return collapsed ? (
    <Tooltip
      contents
      label={item.name}
      hotkey={hotkey}
      placement={TOOLTIP_PLACEMENT.RIGHT}
    >
      {row}
    </Tooltip>
  ) : (
    row
  );
};

export default FolderItem;
