import Icon from "@/shared/components/elements/Icon";
import UsageBar from "@/shared/components/elements/UsageBar";
import Tooltip, {
  TOOLTIP_PLACEMENT,
} from "@/shared/components/elements/Tooltip";
import { classNames, activateOnKey, volumeIcon } from "@/shared/utils";

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
      <Icon icon={volumeIcon(volume)} />
      <div className="details">
        <p>
          <span>{volume.mountPoint}</span> {volume.name}
        </p>
        <UsageBar percentage={volume.diskUsage.percentage} />
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
