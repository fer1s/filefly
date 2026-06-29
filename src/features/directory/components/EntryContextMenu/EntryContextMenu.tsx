import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { useStateContext } from "@/shared/providers/StateProvider";
import { extension } from "@/shared/utils";
import { useKeymap, formatBinding } from "@/shared/keymap";

import {
  ENTRY_ACTIONS,
  ACTION_SEPARATOR,
  resolveActionIds,
  isActionVisible,
  type EntryActionContext,
  type EntryActionId,
} from "../../actions";
import { useContextMenuLayout } from "../../hooks/useContextMenuLayout";

import type { EntryContextMenuProps } from "./types";

// Right-click menu for the directory: the current directory (empty area), a folder, or a
// file. The visible actions per context come from context_menu.toml (loaded once); each id
// resolves to a predefined action descriptor that owns its label, icon, hotkey and behavior.
const EntryContextMenu = ({
  contextMenuRef,
  visible,
  onClose,
  elementId,
  elementType,
  isCurrentDirectory,
  inTrash,
  selectedIDs,
  canPaste,
  fileOps,
  onStartRename,
  onPreview,
  onProperties,
}: EntryContextMenuProps) => {
  const { fs, setPath } = useStateContext();
  const { keymap } = useKeymap();
  const layout = useContextMenuLayout();

  // Act on the whole selection if the clicked item is part of it, otherwise just that item.
  const targets = selectedIDs.includes(elementId) ? selectedIDs : [elementId];
  const fileExtension = extension(elementId);

  const ctx: EntryActionContext = {
    elementId,
    elementType,
    targets,
    isCurrentDirectory,
    canPaste,
    fs,
    fileOps,
    setPath,
    onClose,
    onStartRename,
    onPreview,
    onProperties,
  };

  const actionIds = resolveActionIds(layout, {
    isCurrentDirectory,
    inTrash,
    elementType,
    extension: fileExtension,
  });

  return (
    <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
      {actionIds.map((id, index) => {
        if (id === ACTION_SEPARATOR)
          return <ContextMenuItem key={`separator-${index}`} isSeparator />;

        const action = ENTRY_ACTIONS[id as EntryActionId];
        if (!action || !isActionVisible(action, ctx)) return null;

        const enabled = action.isEnabled ? action.isEnabled(ctx) : true;
        const hotkey =
          action.hotkey ??
          (action.keymapAction
            ? formatBinding(keymap[action.keymapAction])
            : undefined);

        return (
          <ContextMenuItem
            key={action.id}
            text={action.label()}
            icon={<Icon icon={action.icon} />}
            hotkey={hotkey}
            color={action.color}
            onClick={enabled ? () => action.run(ctx) : undefined}
          />
        );
      })}
    </ContextMenu>
  );
};

export default EntryContextMenu;
