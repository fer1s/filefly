import { useState, type KeyboardEvent } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { Volume } from "@/shared/models";
import { classNames } from "@/shared/utils";
import { VIEW_MODE, KEY } from "@/shared/constants";
import Icon from "@/shared/components/elements/Icon";
import { t } from "@/lang";

import { faHardDrive } from "@fortawesome/free-solid-svg-icons";
import { faUsb } from "@fortawesome/free-brands-svg-icons";

import "@/styles/views/Volumes.css";

const Volumes = () => {
  const { volumes, setPath, view } = useStateContext();

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
      {view === VIEW_MODE.GRID ? (
        <div className="grid">
          {volumes.map((volume) => (
            <VolumeCard
              key={`${volume.name}#${volume.mountPoint}`}
              volume={volume}
              setPath={setPath}
              selected={selected === volume.mountPoint}
              onSelect={() => setSelected(volume.mountPoint)}
            />
          ))}
        </div>
      ) : (
        <div className="volumes_list_wrapper">
          <table className="volumes_list">
            <thead>
              <tr>
                <th scope="col">{t.volumes.name}</th>
                <th scope="col">{t.volumes.mountPoint}</th>
                <th scope="col">{t.volumes.type}</th>
                <th scope="col">{t.volumes.used}</th>
                <th scope="col">{t.volumes.available}</th>
                <th scope="col">{t.volumes.capacity}</th>
              </tr>
            </thead>
            <tbody>
              {volumes.map((volume) => (
                <VolumeListRow
                  key={`${volume.name}#${volume.mountPoint}`}
                  volume={volume}
                  setPath={setPath}
                  selected={selected === volume.mountPoint}
                  onSelect={() => setSelected(volume.mountPoint)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
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

// Keyboard parity with the mouse: Enter opens (like double-click), Space selects (like click).
const handleVolumeKey =
  (open: () => void, select: () => void) =>
  (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === KEY.ENTER) {
      event.preventDefault();
      open();
    } else if (event.key === KEY.SPACE) {
      event.preventDefault();
      select();
    }
  };

const VolumeCard = ({
  volume,
  setPath,
  selected,
  onSelect,
}: VolumeItemProps) => {
  return (
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
      <Icon icon={volume.isRemovable ? faUsb : faHardDrive} />
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

const VolumeListRow = ({
  volume,
  setPath,
  selected,
  onSelect,
}: VolumeItemProps) => {
  return (
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
          <Icon icon={volume.isRemovable ? faUsb : faHardDrive} />
          <div className="volume_summary">
            <span className="volume_name">{volume.name}</span>
            <div className="volume_usage">
              <div className="usage">
                <div
                  className="usage_bar"
                  style={{ width: `${volume.diskUsage.percentage}%` }}
                ></div>
              </div>
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
};
