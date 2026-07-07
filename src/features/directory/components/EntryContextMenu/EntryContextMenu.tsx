import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { useStateContext } from "@/shared/providers/StateProvider";
import { extension } from "@/shared/utils";
import { useKeymap, formatBinding, isMacPlatform } from "@/shared/keymap";

import { TagPicker } from "./TagPicker";

import {
  ENTRY_ACTIONS,
  ACTION_SEPARATOR,
  resolveActionIds,
  isActionVisible,
  type EntryActionContext,
  type EntryActionId,
} from "../../actions";
import { useContextMenuLayout } from "../../hooks/useContextMenuLayout";
import { useArchiveActions } from "../../hooks/useArchiveActions";
import { useSevenzipAvailable } from "@/shared/hooks/useSevenzipAvailable";
import { useDirectory } from "../../providers/DirectoryProvider";

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
  const { fs, setPath, showHidden, toggleShowHidden } = useStateContext();
  const { onCompress, onExtract, onExtractToFolder } =
    useArchiveActions(fileOps);
  const sevenzipAvailable = useSevenzipAvailable();
  const { sort, handleSort } = useDirectory();
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
    onCompress,
    onExtract,
    onExtractToFolder,
    sevenzipAvailable,
    sort,
    onSort: handleSort,
    showHidden,
    toggleShowHidden,
  };

  const actionIds = resolveActionIds(layout, {
    isCurrentDirectory,
    inTrash,
    elementType,
    extension: fileExtension,
  });

  // Finder tags: a colour-swatch row at the top, for a real entry (not the empty-directory menu
  // or the Trash). macOS only — tags are a native macOS feature.
  const showTags = isMacPlatform() && !isCurrentDirectory && !inTrash;

  return (
    <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
      {showTags && (
        <>
          <TagPicker targets={targets} onClose={onClose} />
          <ContextMenuItem isSeparator />
        </>
      )}
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

        // Submenu action (e.g. Sort By): its rows own their behavior; picking one closes the menu.
        const submenu = action.submenu?.(ctx).map((sub) => ({
          key: sub.key,
          text: sub.label,
          icon: sub.icon ? <Icon icon={sub.icon} /> : undefined,
          checked: sub.checked,
          isSeparator: sub.isSeparator,
          onClick: sub.onClick
            ? () => {
                sub.onClick?.();
                onClose();
              }
            : undefined,
        }));

        return (
          <ContextMenuItem
            key={action.id}
            text={action.label()}
            icon={<Icon icon={action.icon} />}
            hotkey={hotkey}
            color={action.color}
            checked={action.checked?.(ctx)}
            submenu={submenu}
            onClick={
              submenu
                ? undefined
                : enabled && action.run
                  ? () => action.run?.(ctx)
                  : undefined
            }
          />
        );
      })}
    </ContextMenu>
  );
};

export default EntryContextMenu;
