import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { DirEntry } from "@/shared/models";
import { classNames, navigateToPath, formatBytes } from "@/shared/utils";
import { useStateContext } from "@/shared/providers/StateProvider";
import {
  ENTRY_KIND,
  IMAGE_FORMATS,
  VIEW_MODE,
  type EntryKind,
  type ViewMode,
} from "@/shared/constants";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFile, faFolder } from "@fortawesome/free-solid-svg-icons";

type DirEntryItemProps = {
  entry: DirEntry;
  setPath: (path: string) => void;
  view: ViewMode;

  selected: boolean;
  onSelect: (e: React.MouseEvent) => void;

  renaming: boolean;
  onRename: (newName: string) => void;
  onCancelRename: () => void;

  setHighlitedElementID: (id: string) => void;
  setHighlitedElementType: (type: EntryKind) => void;
  setDetailsPopupVisible: (visible: boolean) => void;

  setContextMenuVisible: (visible: boolean) => void;
  setContextMenuElementID: (id: string) => void;
  setContextMenuElementType: (type: EntryKind) => void;

  contextMenuRef: React.RefObject<HTMLDivElement | null>;
  id: string;
};

const DirEntryItem = ({
  entry,
  setPath,
  contextMenuRef,
  id,
  view,

  selected,
  onSelect,

  renaming,
  onRename,
  onCancelRename,

  setHighlitedElementID,
  setHighlitedElementType,
  setDetailsPopupVisible,

  setContextMenuVisible,
  setContextMenuElementID,
  setContextMenuElementType,
}: DirEntryItemProps) => {
  const { fs } = useStateContext();

  const itemRef = useRef<HTMLDivElement>(null);

  // handle context menu
  useEffect(() => {
    const item = itemRef.current;
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      if (itemRef.current && contextMenuRef.current) {
        if (!itemRef.current.contains(e.target as Node))
          return setContextMenuVisible(false);

        setContextMenuElementID(itemRef.current.id);

        if (entry.metadata.isDir)
          setContextMenuElementType(ENTRY_KIND.DIRECTORY);
        else if (entry.metadata.isFile)
          setContextMenuElementType(ENTRY_KIND.FILE);
        else setContextMenuElementType(ENTRY_KIND.NONE);

        contextMenuRef.current.style.left = `${e.clientX}px`;
        contextMenuRef.current.style.top = `${e.clientY}px`;

        setContextMenuVisible(true);
      }
    };

    // Attach the event listener to the individual item
    item?.addEventListener("contextmenu", handleContextMenu);
    // Remove the event listener from the individual item
    return () => item?.removeEventListener("contextmenu", handleContextMenu);
  }, [
    contextMenuRef,
    entry.metadata.isDir,
    entry.metadata.isFile,
    setContextMenuElementID,
    setContextMenuElementType,
    setContextMenuVisible,
  ]);

  // handle details popup
  useEffect(() => {
    const item = itemRef.current;
    let timer: number | null = null;

    const handleMouseEnter = () => {
      timer = setTimeout(() => {
        if (!itemRef.current) return;

        setHighlitedElementID(itemRef.current.id);
        if (entry.metadata.isDir) setHighlitedElementType(ENTRY_KIND.DIRECTORY);
        else if (entry.metadata.isFile)
          setHighlitedElementType(ENTRY_KIND.FILE);
        else setHighlitedElementType(ENTRY_KIND.NONE);

        setTimeout(() => {
          if (!itemRef.current) return;
          setDetailsPopupVisible(true);
        }, 1000);
      }, 1000);
    };

    const handleMouseLeave = () => {
      setDetailsPopupVisible(false);
      if (timer) clearTimeout(timer);
    };

    item?.addEventListener("mouseenter", handleMouseEnter);
    item?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      item?.removeEventListener("mouseenter", handleMouseEnter);
      item?.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [
    entry.metadata.isDir,
    entry.metadata.isFile,
    setDetailsPopupVisible,
    setHighlitedElementID,
    setHighlitedElementType,
  ]);

  // Move keyboard focus to the entry when it becomes the selected one.
  useEffect(() => {
    if (selected) itemRef.current?.focus();
  }, [selected]);

  // Inline rename: focus the input and preselect the base name (without extension) when editing starts.
  const renameInputRef = useRef<HTMLInputElement>(null);
  const renameDoneRef = useRef(false);

  useEffect(() => {
    if (!renaming || !renameInputRef.current) return;
    renameDoneRef.current = false;
    const el = renameInputRef.current;
    el.focus();
    const dot = entry.name.lastIndexOf(".");
    el.setSelectionRange(0, dot > 0 ? dot : entry.name.length);
  }, [entry.name, renaming]);

  const submitRename = () => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    const value = renameInputRef.current?.value.trim();
    if (value && value !== entry.name) onRename(value);
    else onCancelRename();
  };

  const cancelRename = () => {
    if (renameDoneRef.current) return;
    renameDoneRef.current = true;
    onCancelRename();
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Enter") submitRename();
    else if (e.key === "Escape") cancelRename();
  };

  const renameInput = (
    <input
      ref={renameInputRef}
      className="rename_input"
      defaultValue={entry.name}
      onKeyDown={handleRenameKeyDown}
      onBlur={submitRename}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );

  // Split extension from the file name
  const name = entry.metadata.isFile ? entry.name.split(".")[0] : entry.name;
  const extension = entry.metadata.isFile
    ? entry.name.split(".")[entry.name.split(".").length - 1]
    : "";

  return (
    <div
      className={classNames("dir_entry_item", selected && "selected")}
      id={id}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={() =>
        entry.metadata.isDir
          ? navigateToPath(entry, setPath)
          : fs.open(entry.path)
      }
      ref={itemRef}
    >
      {view === VIEW_MODE.GRID ? (
        <>
          {extension && name && <div className="extension">{extension}</div>}

          {IMAGE_FORMATS.includes(extension.toLowerCase().trim()) ? (
            <img src={convertFileSrc(entry.path)} />
          ) : (
            <FontAwesomeIcon icon={entry.metadata.isDir ? faFolder : faFile} />
          )}

          <div className="dir_entry_info">
            {renaming ? (
              renameInput
            ) : (
              <h3>
                {name
                  ? name.length > 9
                    ? name.substring(0, 9) + "..."
                    : name
                  : extension}
              </h3>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="icon">
            {IMAGE_FORMATS.includes(extension.toLowerCase().trim()) ? (
              <img src={convertFileSrc(entry.path)} />
            ) : (
              <FontAwesomeIcon
                icon={entry.metadata.isDir ? faFolder : faFile}
              />
            )}
          </div>
          <div className="name">
            {renaming ? (
              renameInput
            ) : (
              <h3>
                {name
                  ? name.length > 25
                    ? name.substring(0, 25) + "..."
                    : name
                  : extension}
              </h3>
            )}
          </div>
          <div className="size">
            {entry.size > 0 && <h3>{formatBytes(entry.size)}</h3>}
          </div>
          <div className="extension">
            {extension && name && <h3>{extension}</h3>}
          </div>
        </>
      )}
    </div>
  );
};

export { DirEntryItem };
