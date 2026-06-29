import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { useStateContext } from "@/shared/providers/StateProvider";

import {
  VOLUME_ACTIONS,
  VOLUME_MENU,
  ACTION_SEPARATOR,
  type VolumeActionContext,
  type VolumeActionId,
} from "../../actions";

import type { VolumeContextMenuProps } from "./types";

// Right-click menu for the Volumes view. The actions come from the declarative VOLUME_MENU; each
// id resolves to a predefined descriptor that owns its label, icon and behavior (Eject only shows
// for removable volumes via its isVisible predicate).
const VolumeContextMenu = ({
  contextMenuRef,
  visible,
  volume,
  onClose,
  openProperties,
}: VolumeContextMenuProps) => {
  const { fs, setPath, newTab, setVolumes } = useStateContext();

  const ctx: VolumeActionContext | null = volume
    ? {
        path: volume.mountPoint,
        name: volume.name,
        isRemovable: volume.isRemovable,
        fs,
        setPath,
        openInNewTab: newTab,
        openProperties,
        refreshVolumes: () => {
          fs.listVolumes().then(setVolumes);
        },
        onClose,
      }
    : null;

  return (
    <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
      {ctx &&
        VOLUME_MENU.map((id, index) => {
          if (id === ACTION_SEPARATOR)
            return <ContextMenuItem key={`separator-${index}`} isSeparator />;

          const action = VOLUME_ACTIONS[id as VolumeActionId];
          if (!action || (action.isVisible && !action.isVisible(ctx)))
            return null;

          return (
            <ContextMenuItem
              key={action.id}
              text={action.label()}
              icon={<Icon icon={action.icon} />}
              onClick={() => action.run(ctx)}
            />
          );
        })}
    </ContextMenu>
  );
};

export default VolumeContextMenu;
