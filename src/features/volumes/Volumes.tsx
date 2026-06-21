import { useState } from "react";

import { useStateContext } from "../../shared/providers/StateProvider";
import { Volume } from "../../shared/models";
import { classNames } from "../../shared/utils";
import { t } from "../../lang";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHardDrive } from "@fortawesome/free-solid-svg-icons";
import { faUsb } from "@fortawesome/free-brands-svg-icons";

import "../../styles/views/Volumes.css";

const Volumes = () => {
  const { volumes, setPath } = useStateContext();

  // Single click selects (visual); double click enters, like the directory entries.
  const [selected, setSelected] = useState("");

  return (
    <div
      className="volumes_page"
      onClick={(e) =>
        !(e.target as HTMLElement).closest(".volume_item") && setSelected("")
      }
    >
      <h1>{t.volumes.title}</h1>
      <div className="grid">
        {volumes.map((volume) => (
          <VolumeItem
            key={`${volume.name}#${volume.mountPoint}`}
            volume={volume}
            setPath={setPath}
            selected={selected === volume.mountPoint}
            onSelect={() => setSelected(volume.mountPoint)}
          />
        ))}
      </div>
    </div>
  );
};

export default Volumes;

type VolumeItemProps = {
  volume: Volume;
  setPath: (path: string) => void;
  selected: boolean;
  onSelect: () => void;
};

const VolumeItem = ({
  volume,
  setPath,
  selected,
  onSelect,
}: VolumeItemProps) => {
  return (
    <div
      className={classNames("volume_item", selected && "selected")}
      onClick={onSelect}
      onDoubleClick={() => setPath(volume.mountPoint)}
    >
      <FontAwesomeIcon icon={volume.isRemovable ? faUsb : faHardDrive} />
      <div className="volume_info">
        <h3>
          <span>{volume.mountPoint}</span> {volume.name}
        </h3>
        <div className="usage">
          <div
            className="usage_bar"
            style={{ width: `${volume.diskUsage.percentage}%` }}
          ></div>
        </div>
        <p>{t.volumes.freeOf(volume.availableSpace, volume.totalSpace)}</p>
      </div>
    </div>
  );
};
