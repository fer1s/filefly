import { useStateContext } from "@/shared/providers/StateProvider";
import { useKeymap, formatBinding } from "@/shared/keymap";
import IconButton from "@/shared/components/elements/IconButton";
import { extension } from "@/shared/utils";
import { TRASH_DIR_NAME } from "@/shared/constants";
import { ENTRY_KIND } from "@/features/directory/constants";

import { useDirectory } from "../../providers/DirectoryProvider";
import { useContextMenuLayout } from "../../hooks/useContextMenuLayout";
import {
  ENTRY_ACTIONS,
  ACTION_SEPARATOR,
  resolveActionIds,
  isActionVisible,
  type EntryActionContext,
  type EntryActionId,
} from "../../actions";

import "@/styles/components/QuickActions.css";

// Quick-actions toolbar (left of the QuickBar): the same context-menu actions, but driven by
// the current selection — the folder's own actions when nothing is selected, the selected
// entry's actions otherwise (applied to every selected entry).
const QuickActions = () => {
  const { fs, path, setPath } = useStateContext();
  const { keymap } = useKeymap();
  const layout = useContextMenuLayout();
  const { sorted, selectedIDs, setRenamingID, fileOps, preview, properties } =
    useDirectory();

  const hasSelection = selectedIDs.length > 0;
  const elementId = hasSelection ? selectedIDs[0] : path;
  const firstEntry = hasSelection
    ? sorted.find((entry) => entry.path === selectedIDs[0])
    : undefined;
  const elementType =
    hasSelection && firstEntry && !firstEntry.metadata.isDir
      ? ENTRY_KIND.FILE
      : ENTRY_KIND.DIRECTORY;
  const isCurrentDirectory = !hasSelection;
  const inTrash = path.endsWith(`/${TRASH_DIR_NAME}`);
  const fileExtension = extension(elementId);

  const ctx: EntryActionContext = {
    elementId,
    elementType,
    targets: hasSelection ? selectedIDs : [path],
    isCurrentDirectory,
    canPaste: !!fileOps.clipboard,
    fs,
    fileOps,
    setPath,
    onClose: () => {},
    onStartRename: setRenamingID,
    onPreview: preview.open,
    onProperties: properties.open,
  };

  const actionIds = resolveActionIds(layout, {
    isCurrentDirectory,
    inTrash,
    elementType,
    extension: fileExtension,
  }).filter((id) => id !== ACTION_SEPARATOR);

  if (path === "" || actionIds.length === 0) return null;

  return (
    <div className="quick_actions">
      {actionIds.map((id) => {
        const action = ENTRY_ACTIONS[id as EntryActionId];
        if (!action || !isActionVisible(action, ctx)) return null;

        const enabled = action.isEnabled ? action.isEnabled(ctx) : true;
        const hotkey =
          action.hotkey ??
          (action.keymapAction
            ? formatBinding(keymap[action.keymapAction])
            : undefined);

        return (
          <IconButton
            key={action.id}
            icon={action.icon}
            tooltip={action.label()}
            hotkey={hotkey}
            disabled={!enabled}
            onClick={() => action.run(ctx)}
            className={action.color ? `qa_${action.color}` : undefined}
          />
        );
      })}
    </div>
  );
};

export default QuickActions;
