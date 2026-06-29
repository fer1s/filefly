import type { MouseEvent, RefObject } from "react";

import { DirEntry } from "@/shared/models";
import type { EntryKind, ViewMode } from "@/shared/constants";

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
};
