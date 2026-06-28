import Icon from "@/shared/components/elements/Icon";
import Tooltip, {
  TOOLTIP_PLACEMENT,
} from "@/shared/components/elements/Tooltip";
import { classNames, activateOnKey } from "@/shared/utils";
import { faHardDrive } from "@fortawesome/free-solid-svg-icons";
import { faUsb } from "@fortawesome/free-brands-svg-icons";

import { VOLUME_ITEM_STAGGER_MS } from "./constants";
import type { VolumeItemProps } from "./types";

const VolumeItem = ({
  volume,
  setPath,
  index,
  collapsed,
  active,
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
      style={{ animationDelay: `${index * VOLUME_ITEM_STAGGER_MS}ms` }}
    >
      <Icon icon={volume.isRemovable ? faUsb : faHardDrive} />
      <div className="details">
        <p>
          <span>{volume.mountPoint}</span> {volume.name}
        </p>
        <div className="usage">
          <div
            className="usage_bar"
            style={{ width: `${volume.diskUsage.percentage}%` }}
          ></div>
        </div>
      </div>
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
