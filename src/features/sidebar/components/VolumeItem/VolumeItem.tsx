import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
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
  return (
    <div
      className={classNames("drive_item", active && "active")}
      onClick={() => setPath(volume.mountPoint)}
      style={{ animationDelay: `${index * VOLUME_ITEM_STAGGER_MS}ms` }}
      title={collapsed ? `${volume.mountPoint} ${volume.name}` : undefined}
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
};

export default VolumeItem;
