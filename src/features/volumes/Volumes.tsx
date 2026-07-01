import { useState, type MouseEvent } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { useContextMenuState } from "@/shared/hooks/useContextMenuState";
import { useEntryProperties } from "@/shared/hooks/useEntryProperties";
import { Properties } from "@/features/directory";
import { VIEW_MODE } from "@/shared/constants";
import type { Volume } from "@/shared/models";
import { t } from "@/lang";

import "@/styles/views/Volumes.css";

import VolumeCard from "./components/VolumeCard";
import VolumeListRow from "./components/VolumeListRow";
import VolumeContextMenu from "./components/VolumeContextMenu";

const Volumes = () => {
  const { volumes, setPath, view } = useStateContext();

  // Single click selects (visual); double click enters, like the directory entries.
  const [selected, setSelected] = useState("");

  const menu = useContextMenuState<Volume>();
  const properties = useEntryProperties();

  // Open the context menu at the cursor for a volume.
  const onVolumeContextMenu = (volume: Volume) => (e: MouseEvent) => {
    e.preventDefault();
    setSelected(volume.mountPoint);
    menu.openAt(e.clientX, e.clientY, volume);
  };

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
              onContextMenu={onVolumeContextMenu(volume)}
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
                  onContextMenu={onVolumeContextMenu(volume)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VolumeContextMenu
        contextMenuRef={menu.ref}
        visible={menu.visible}
        volume={menu.payload}
        onClose={menu.close}
        openProperties={properties.open}
      />
      <Properties
        entry={properties.entry}
        visible={properties.visible}
        onClose={properties.close}
      />
    </div>
  );
};

export default Volumes;
