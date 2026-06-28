import { useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { VIEW_MODE } from "@/shared/constants";
import { t } from "@/lang";

import "@/styles/views/Volumes.css";

import VolumeCard from "./components/VolumeCard";
import VolumeListRow from "./components/VolumeListRow";

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
