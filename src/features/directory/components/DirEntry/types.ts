import type { MouseEvent, RefObject } from "react";

import { DirEntry } from "@/shared/models";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { type EntryKind } from "@/shared/constants";

export type DirEntryItemProps = {
  entry: DirEntry;
  fs: FileSystemManager;
  setPath: (path: string) => void;

  selected: boolean;
  onSelect: (id: string, e: MouseEvent) => void;

  renaming: boolean;
  onRename: (path: string, newName: string) => void;
  onCancelRename: () => void;

  setContextMenuVisible: (visible: boolean) => void;
  setContextMenuElementID: (id: string) => void;
  setContextMenuElementType: (type: EntryKind) => void;

  contextMenuRef: RefObject<HTMLDivElement | null>;
  id: string;
};
