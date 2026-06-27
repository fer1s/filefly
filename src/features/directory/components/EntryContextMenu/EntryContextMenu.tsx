import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import Icon from "@/shared/components/elements/Icon";
import { useStateContext } from "@/shared/providers/StateProvider";
import { ACCEPTED_PREVIEW_FORMATS, ENTRY_KIND, KEY } from "@/shared/constants";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { t } from "@/lang";

import {
  faArrowUpRightFromSquare,
  faCircleInfo,
  faCopy,
  faEye,
  faFilePen,
  faPaste,
  faScissors,
  faTerminal,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import type { EntryContextMenuProps } from "./types";

// Open is bound to Enter via keyboard nav (fixed, not user-configurable); show its glyph.
const OPEN_HOTKEY = formatBinding({ keys: [KEY.ENTER] });

// Right-click menu for the directory: the current directory (empty area), a folder, or a
// file. Each action acts on the clicked item (or the whole selection when it's part of it)
// and closes the menu.
const EntryContextMenu = ({
  contextMenuRef,
  visible,
  onClose,
  elementId,
  elementType,
  isCurrentDirectory,
  selectedIDs,
  canPaste,
  fileOps,
  onStartRename,
  onPreview,
  onProperties,
}: EntryContextMenuProps) => {
  const { fs, setPath } = useStateContext();
  const { keymap } = useKeymap();

  // The whole selection if the clicked item is part of it, otherwise just the clicked item.
  const actionTargets = () =>
    selectedIDs.includes(elementId) ? selectedIDs : [elementId];

  const canPreview = ACCEPTED_PREVIEW_FORMATS.includes(
    elementId.split(".").pop() || "",
  );

  const handleOpen = () => {
    if (elementType === ENTRY_KIND.FILE) fs.open(elementId);
    else if (elementType === ENTRY_KIND.DIRECTORY) setPath(elementId);
    onClose();
  };

  const handleOpenInTerminal = () => {
    if (elementType === ENTRY_KIND.DIRECTORY) fs.openInTerminal(elementId);
    else if (elementType === ENTRY_KIND.FILE)
      fs.openInTerminal(elementId.split("/").slice(0, -1).join("/"));
    onClose();
  };

  const handlePreview = () => {
    onPreview(elementId);
    onClose();
  };

  const handleCopy = () => {
    fileOps.copy(actionTargets());
    onClose();
  };

  const handleCut = () => {
    fileOps.cut(actionTargets());
    onClose();
  };

  const handleDelete = async () => {
    const targets = actionTargets();
    onClose();
    await fileOps.remove(targets);
  };

  const handlePaste = async () => {
    onClose();
    await fileOps.paste();
  };

  const handleRename = () => {
    onStartRename(elementId);
    onClose();
  };

  const handleProperties = async () => {
    onClose();
    await onProperties(elementId, isCurrentDirectory);
  };

  return (
    <ContextMenu contextMenuVisible={visible} ref={contextMenuRef}>
      {isCurrentDirectory && (
        <>
          <ContextMenuItem
            text={t.contextMenu.paste}
            icon={<Icon icon={faPaste} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.PASTE])}
            onClick={canPaste ? handlePaste : undefined}
          />
          <ContextMenuItem isSeparator />
          <ContextMenuItem
            text={t.contextMenu.openInTerminal}
            icon={<Icon icon={faTerminal} />}
            onClick={handleOpenInTerminal}
          />
          <ContextMenuItem isSeparator />
          <ContextMenuItem
            text={t.contextMenu.properties}
            icon={<Icon icon={faCircleInfo} />}
            onClick={handleProperties}
          />
        </>
      )}

      {elementType === ENTRY_KIND.DIRECTORY && !isCurrentDirectory && (
        <>
          <ContextMenuItem
            text={t.contextMenu.open}
            icon={<Icon icon={faArrowUpRightFromSquare} />}
            hotkey={OPEN_HOTKEY}
            onClick={handleOpen}
          />
          <ContextMenuItem
            text={t.contextMenu.openInTerminal}
            icon={<Icon icon={faTerminal} />}
            onClick={handleOpenInTerminal}
          />
          <ContextMenuItem
            text={t.contextMenu.copy}
            icon={<Icon icon={faCopy} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.COPY])}
            onClick={handleCopy}
          />
          <ContextMenuItem
            text={t.contextMenu.cut}
            icon={<Icon icon={faScissors} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.CUT])}
            onClick={handleCut}
          />
          <ContextMenuItem
            text={t.contextMenu.rename}
            icon={<Icon icon={faFilePen} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.RENAME])}
            onClick={handleRename}
          />
          <ContextMenuItem
            text={t.contextMenu.delete}
            icon={<Icon icon={faTrash} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.TRASH])}
            onClick={handleDelete}
          />
        </>
      )}

      {elementType === ENTRY_KIND.FILE && (
        <>
          <ContextMenuItem
            text={t.contextMenu.open}
            icon={<Icon icon={faArrowUpRightFromSquare} />}
            hotkey={OPEN_HOTKEY}
            onClick={handleOpen}
          />
          {canPreview && (
            <ContextMenuItem
              text={t.common.preview}
              icon={<Icon icon={faEye} />}
              onClick={handlePreview}
            />
          )}
          <ContextMenuItem
            text={t.contextMenu.copy}
            icon={<Icon icon={faCopy} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.COPY])}
            onClick={handleCopy}
          />
          <ContextMenuItem
            text={t.contextMenu.cut}
            icon={<Icon icon={faScissors} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.CUT])}
            onClick={handleCut}
          />
          <ContextMenuItem
            text={t.contextMenu.rename}
            icon={<Icon icon={faFilePen} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.RENAME])}
            onClick={handleRename}
          />
          <ContextMenuItem
            text={t.contextMenu.delete}
            icon={<Icon icon={faTrash} />}
            hotkey={formatBinding(keymap[KEYMAP_ACTION.TRASH])}
            onClick={handleDelete}
          />
        </>
      )}

      {(elementType === ENTRY_KIND.DIRECTORY ||
        elementType === ENTRY_KIND.FILE) &&
        !isCurrentDirectory && (
          <>
            <ContextMenuItem isSeparator />
            <ContextMenuItem
              text={t.contextMenu.properties}
              icon={<Icon icon={faCircleInfo} />}
              onClick={handleProperties}
            />
          </>
        )}
    </ContextMenu>
  );
};

export default EntryContextMenu;
