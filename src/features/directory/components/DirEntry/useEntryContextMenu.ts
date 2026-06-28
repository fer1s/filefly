import { useEffect, type MouseEvent, type RefObject } from "react";

import { DirEntry } from "@/shared/models";
import { ENTRY_KIND, type EntryKind } from "@/shared/constants";

type Args = {
  itemRef: RefObject<HTMLDivElement | null>;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  entry: DirEntry;
  selected: boolean;
  onSelect: (id: string, e: MouseEvent) => void;
  setContextMenuElementID: (id: string) => void;
  setContextMenuElementType: (type: EntryKind) => void;
  setContextMenuVisible: (visible: boolean) => void;
};

// Wires the entry's own right-click handler: it positions and opens the shared context menu for
// this element, and selects the entry first (right-click / Ctrl-click), unless it's already part
// of the selection so a multi-selection stays intact.
export const useEntryContextMenu = ({
  itemRef,
  contextMenuRef,
  entry,
  selected,
  onSelect,
  setContextMenuElementID,
  setContextMenuElementType,
  setContextMenuVisible,
}: Args) => {
  useEffect(() => {
    const item = itemRef.current;
    const handleContextMenu = (e: globalThis.MouseEvent) => {
      e.preventDefault();

      if (itemRef.current && contextMenuRef.current) {
        if (!itemRef.current.contains(e.target as Node))
          return setContextMenuVisible(false);

        if (!selected) onSelect(entry.path, e as unknown as MouseEvent);

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

    item?.addEventListener("contextmenu", handleContextMenu);
    return () => item?.removeEventListener("contextmenu", handleContextMenu);
  }, [
    itemRef,
    contextMenuRef,
    entry.metadata.isDir,
    entry.metadata.isFile,
    entry.path,
    selected,
    onSelect,
    setContextMenuElementID,
    setContextMenuElementType,
    setContextMenuVisible,
  ]);
};
