import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { useStateContext } from "@/shared/providers/StateProvider";
import { extension } from "@/shared/utils";
import { RECENTS } from "@/shared/constants";
import { useKeymap, formatBinding, isMacPlatform } from "@/shared/keymap";
import { customActionIcon } from "@/shared/contextActions";

import { TagPicker } from "./TagPicker";

import {
  ENTRY_ACTIONS,
  ACTION_SEPARATOR,
  resolveActionIds,
  resolveCustomActions,
  isActionVisible,
  resolveActionIcon,
  type EntryActionContext,
  type EntryActionId,
} from "../../actions";
import { opensInAppPreview } from "../../constants";
import { useFileTypeExtensions } from "../../formats";
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
  actionIds: providedActionIds,
  showTags = true,
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
  const {
    fs,
    path,
    setPath,
    newTab,
    showHidden,
    toggleShowHidden,
    previewImagesInApp,
    previewMarkdownInApp,
  } = useStateContext();
  const { onCompress, onExtract, onExtractToFolder } =
    useArchiveActions(fileOps);
  const sevenzipAvailable = useSevenzipAvailable();
  const { sort, handleSort, searchActive, focusCreatedEntry } = useDirectory();
  const { keymap } = useKeymap();
  const layout = useContextMenuLayout();
  const fileTypes = useFileTypeExtensions();

  // Act on the whole selection if the clicked item is part of it, otherwise just that item.
  const targets = selectedIDs.includes(elementId) ? selectedIDs : [elementId];
  const fileExtension = extension(elementId);

  const ctx: EntryActionContext = {
    elementId,
    elementType,
    targets,
    isCurrentDirectory,
    isDispersedView: path === RECENTS || searchActive,
    canPaste,
    fs,
    fileOps,
    setPath,
    openInNewTab: newTab,
    onClose,
    onStartRename,
    onEntryCreated: focusCreatedEntry,
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
    opensInAppPreview: opensInAppPreview(
      fileExtension.toLowerCase(),
      fileTypes,
      previewImagesInApp,
      previewMarkdownInApp,
    ),
  };

  const actionIds =
    providedActionIds ??
    resolveActionIds(layout, {
      isCurrentDirectory,
      inTrash,
      elementType,
      extension: fileExtension,
    });
  const customActions = providedActionIds
    ? []
    : resolveCustomActions(layout, {
        isCurrentDirectory,
        inTrash,
        elementType,
        extension: fileExtension,
        elementId,
      });
  const hasVisiblePredefinedActions = actionIds.some((id) => {
    const action = ENTRY_ACTIONS[id as EntryActionId];
    return !!action && isActionVisible(action, ctx);
  });

  // Finder tags: a colour-swatch row at the top, for a real entry (not the empty-directory menu
  // or the Trash). macOS only — tags are a native macOS feature.
  const shouldShowTags =
    showTags && isMacPlatform() && !isCurrentDirectory && !inTrash;

  return (
    <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
      {shouldShowTags && (
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
            icon={<Icon icon={resolveActionIcon(action, ctx)} />}
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
      {customActions.length > 0 && hasVisiblePredefinedActions && (
        <ContextMenuItem isSeparator />
      )}
      {customActions.map((action) => (
        <ContextMenuItem
          key={`custom-${action.id}`}
          text={action.label}
          icon={<Icon icon={customActionIcon(action.icon)} />}
          onClick={() => {
            onClose();
            void fs.runContextAction(action.id, elementId, targets);
          }}
        />
      ))}
    </ContextMenu>
  );
};

export default EntryContextMenu;
