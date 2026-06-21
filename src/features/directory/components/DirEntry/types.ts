import type { MouseEvent, RefObject } from "react";

import { DirEntry } from "@/shared/models";
import { type EntryKind, type ViewMode } from "@/shared/constants";

export type DirEntryItemProps = {
  entry: DirEntry;
  setPath: (path: string) => void;
  view: ViewMode;

  selected: boolean;
  onSelect: (e: MouseEvent) => void;

  renaming: boolean;
  onRename: (newName: string) => void;
  onCancelRename: () => void;

  setHighlitedElementID: (id: string) => void;
  setHighlitedElementType: (type: EntryKind) => void;
  setDetailsPopupVisible: (visible: boolean) => void;

  setContextMenuVisible: (visible: boolean) => void;
  setContextMenuElementID: (id: string) => void;
  setContextMenuElementType: (type: EntryKind) => void;

  contextMenuRef: RefObject<HTMLDivElement | null>;
  id: string;
};
