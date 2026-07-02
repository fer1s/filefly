import type { MouseEvent, RefObject } from "react";

import { DirEntry } from "@/shared/models";
import type { EntryDragBinder } from "@/features/directory/hooks/useEntryDragMove";
import type { ViewMode } from "@/shared/constants";
import type { EntryKind } from "@/features/directory/constants";

export type EntriesViewProps = {
  entries: DirEntry[];
  view: ViewMode;
  selectedIDs: string[];
  // Paths currently on the clipboard in cut mode, dimmed until the cut is pasted or cleared.
  cutPaths: Set<string>;
  renamingID: string;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  onSelect: (path: string, e: MouseEvent) => void;
  onRename: (path: string, newName: string) => void;
  onCancelRename: () => void;
  menu: {
    setVisible: (visible: boolean) => void;
    setId: (id: string) => void;
    setType: (type: EntryKind) => void;
  };
  // Drag-to-move binder, forwarded to each row's root (see useEntryDragMove).
  bindDrag: EntryDragBinder;
  // Suppress each entry's metadata hover card (dialog / preview panel open). Forwarded to rows.
  metadataTooltipDisabled: boolean;
};
