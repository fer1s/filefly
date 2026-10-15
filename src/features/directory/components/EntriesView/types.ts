import type { MouseEvent, RefObject } from "react";

import { DirEntry } from "@/shared/models";
import type { EntryDragBinder } from "@/features/directory/hooks/useEntryDragMove";
import type { ViewMode } from "@/shared/constants";
import type { EntryKind } from "@/features/directory/constants";

export type EntriesViewProps = {
  entries: DirEntry[];
  view: ViewMode;
  // True only in grid view at a zoom where the folder image mosaic is legible.
  showFolderThumbnails: boolean;
  selectedIDs: string[];
  // Paths currently on the clipboard in cut mode, dimmed until the cut is pasted or cleared.
  cutPaths: Set<string>;
  renamingID: string;
  contextMenuRef: RefObject<HTMLDivElement | null>;
  onSelect: (path: string, e: MouseEvent) => void;
  // Open a file (double-click); routes images to the built-in preview per the setting.
  onOpenFile: (entry: DirEntry) => void;
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
  // Active type-to-find query. While present, the single selected entry is also a reveal target,
  // so matches beyond the current render batch can be mounted and scrolled into view.
  typeaheadQuery: string;
  // Saved viewport for this exact tab/history entry. EntriesView grows its lazy render slice as
  // needed before restoring deep positions in large folders.
  scrollRestoreKey: string;
  scrollPosition: number;
  // A revealed entry (sfb <file> / URL scheme / dock) to scroll into view once; the view grows the
  // render slice to include it if needed, scrolls to it, then calls clearRevealID. Null when none.
  revealID: string | null;
  clearRevealID: () => void;
};
