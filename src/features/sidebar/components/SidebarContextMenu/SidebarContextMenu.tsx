import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { useStateContext } from "@/shared/providers/StateProvider";

import {
  SIDEBAR_ACTIONS,
  ACTION_SEPARATOR,
  resolveSidebarActions,
  type SidebarActionContext,
  type SidebarActionId,
} from "../../actions";

import type { SidebarContextMenuProps } from "./types";

// Right-click menu for sidebar rows. The visible actions per row come from the declarative
// SIDEBAR_MENU_LAYOUT (keyed by item kind); each id resolves to a predefined descriptor that
// owns its label, icon, color and behavior.
const SidebarContextMenu = ({
  contextMenuRef,
  visible,
  target,
  onClose,
  openProperties,
  editConnection,
  removeConnection,
}: SidebarContextMenuProps) => {
  const { fs, path, newTab, refreshDir, setVolumes } = useStateContext();

  const actionIds = target ? resolveSidebarActions(target.kind) : [];

  const ctx: SidebarActionContext | null = target && {
    path: target.path,
    kind: target.kind,
    isEjectable: target.isEjectable ?? false,
    currentPath: path,
    fs,
    openInNewTab: newTab,
    openProperties,
    editConnection,
    removeConnection,
    refreshDir,
    refreshVolumes: () => {
      fs.listVolumes().then(setVolumes);
    },
    onClose,
  };

  return (
    <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
      {ctx &&
        actionIds.map((id, index) => {
          if (id === ACTION_SEPARATOR)
            return <ContextMenuItem key={`separator-${index}`} isSeparator />;

          const action = SIDEBAR_ACTIONS[id as SidebarActionId];
          if (!action || (action.isVisible && !action.isVisible(ctx)))
            return null;

          return (
            <ContextMenuItem
              key={action.id}
              text={action.label()}
              icon={<Icon icon={action.icon} />}
              color={action.color}
              onClick={() => action.run(ctx)}
            />
          );
        })}
    </ContextMenu>
  );
};

export default SidebarContextMenu;
