import { classNames, volumeIcon } from "@/shared/utils";
import Icon from "@/shared/components/elements/Icon";
import UsageBar from "@/shared/components/elements/UsageBar";
import { t } from "@/lang";

import { handleVolumeKey } from "../utils";
import type { VolumeItemProps } from "../types";

// Table row for a volume (list view). Click selects, double-click opens.
const VolumeListRow = ({
  volume,
  setPath,
  selected,
  onSelect,
}: VolumeItemProps) => (
  <tr
    className={classNames("volume_item", selected && "selected")}
    tabIndex={0}
    aria-label={`${volume.mountPoint} ${volume.name}`}
    onClick={onSelect}
    onDoubleClick={() => setPath(volume.mountPoint)}
    onKeyDown={handleVolumeKey(() => setPath(volume.mountPoint), onSelect)}
  >
    <td>
      <div className="volume_identity">
        <Icon icon={volumeIcon(volume)} />
        <div className="volume_summary">
          <span className="volume_name">{volume.name}</span>
          <div className="volume_usage">
            <UsageBar percentage={volume.diskUsage.percentage} />
            <span>{volume.diskUsage.percentage}%</span>
          </div>
        </div>
      </div>
    </td>
    <td className="mount_point">{volume.mountPoint}</td>
    <td>{volume.isRemovable ? t.volumes.removable : t.volumes.localDrive}</td>
    <td>{volume.diskUsage.used}</td>
    <td>{volume.availableSpace}</td>
    <td>{volume.totalSpace}</td>
  </tr>
);

export default VolumeListRow;
