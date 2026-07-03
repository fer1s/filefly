import { faEject } from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import IconButton, {
  ICON_BUTTON_VARIANT,
  ICON_BUTTON_SIZE,
} from "@/shared/components/elements/IconButton";
import UsageBar from "@/shared/components/elements/UsageBar";
import Tooltip, {
  TOOLTIP_PLACEMENT,
} from "@/shared/components/elements/Tooltip";
import { classNames, activateOnKey, volumeIcon } from "@/shared/utils";
import { t } from "@/lang";

import { VOLUME_ITEM_STAGGER_MS } from "./constants";
import type { VolumeItemProps } from "./types";

const VolumeItem = ({
  volume,
  setPath,
  index,
  collapsed,
  active,
  onContextMenu,
  onEject,
}: VolumeItemProps) => {
  const open = () => setPath(volume.mountPoint);

  const row = (
    <div
      className={classNames("drive_item", active && "active")}
      role="button"
      tabIndex={0}
      aria-current={active ? "true" : undefined}
      aria-label={`${volume.mountPoint} ${volume.name}`}
      onClick={open}
      onKeyDown={activateOnKey(open)}
      onContextMenu={onContextMenu}
      style={{ animationDelay: `${index * VOLUME_ITEM_STAGGER_MS}ms` }}
    >
      <Icon icon={volumeIcon(volume)} />
      <div className="details">
        <p>
          <span>{volume.mountPoint}</span> {volume.name}
        </p>
        <UsageBar percentage={volume.diskUsage.percentage} />
      </div>
      {onEject && (
        <IconButton
          className="drive_eject"
          icon={faEject}
          variant={ICON_BUTTON_VARIANT.GHOST}
          size={ICON_BUTTON_SIZE.SM}
          tooltip={t.contextMenu.eject}
          aria-label={t.contextMenu.eject}
          // Don't let the click/keypress bubble to the row (which would navigate into the volume).
          onClick={(e) => {
            e.stopPropagation();
            onEject();
          }}
          onKeyDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );

  // Collapsed: the details are hidden in the rail, so surface them in our tooltip.
  return collapsed ? (
    <Tooltip
      contents
      label={`${volume.mountPoint} ${volume.name}`}
      placement={TOOLTIP_PLACEMENT.RIGHT}
    >
      {row}
    </Tooltip>
  ) : (
    row
  );
};

export default VolumeItem;
