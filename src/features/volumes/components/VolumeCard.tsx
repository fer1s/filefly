import { classNames, volumeIcon } from "@/shared/utils";
import Icon from "@/shared/components/elements/Icon";
import UsageBar from "@/shared/components/elements/UsageBar";
import { t } from "@/lang";

import { handleVolumeKey } from "../utils";
import type { VolumeItemProps } from "../types";

// Grid tile for a volume. Click selects, double-click opens (keyboard parity via handleVolumeKey).
const VolumeCard = ({ volume, setPath, selected, onSelect }: VolumeItemProps) => (
  <div
    className={classNames("volume_item", selected && "selected")}
    role="button"
    tabIndex={0}
    aria-pressed={selected}
    aria-label={`${volume.mountPoint} ${volume.name}`}
    onClick={onSelect}
    onDoubleClick={() => setPath(volume.mountPoint)}
    onKeyDown={handleVolumeKey(() => setPath(volume.mountPoint), onSelect)}
  >
    <Icon icon={volumeIcon(volume)} />
    <div className="volume_info">
      <h3>
        <span>{volume.mountPoint}</span> {volume.name}
      </h3>
      <UsageBar percentage={volume.diskUsage.percentage} />
      <p>{t.volumes.freeOf(volume.availableSpace, volume.totalSpace)}</p>
    </div>
  </div>
);

export default VolumeCard;
