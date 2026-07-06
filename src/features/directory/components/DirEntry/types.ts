import type { MouseEvent, RefObject } from "react";

import { DirEntry, Tag } from "@/shared/models";
import type { EntryDragBinder } from "@/features/directory/hooks/useEntryDragMove";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { type EntryKind } from "@/features/directory/constants";

export type DirEntryItemProps = {
  entry: DirEntry;
  fs: FileSystemManager;
  setPath: (path: string) => void;
  // Finder tags for this entry (empty when none / non-macOS). Loaded lazily by EntriesView.
  tags: Tag[];
  // The user's date format, applied to the modified/created columns (list view).
  dateFormat: string;

  selected: boolean;
  // On the clipboard in cut mode — dimmed to 50% until pasted or cleared.
  cut: boolean;
  // The single selected entry that should take keyboard focus (and scroll into view). Distinct
  // from `selected` so bulk selections (Shift / Ctrl+A) don't yank focus to the last item.
  focused: boolean;
  // Whether this entry is the listbox's single Tab stop (roving tabindex). Exactly one entry is
  // tabbable at a time: the focused one, or the first entry when nothing is focused.
  tabbable: boolean;
  onSelect: (id: string, e: MouseEvent) => void;

  renaming: boolean;
  onRename: (path: string, newName: string) => void;
  onCancelRename: () => void;

  setContextMenuVisible: (visible: boolean) => void;
  setContextMenuElementID: (id: string) => void;
  setContextMenuElementType: (type: EntryKind) => void;

  contextMenuRef: RefObject<HTMLDivElement | null>;
  id: string;

  // Drag-to-move binder (@use-gesture), spread onto the row's root. Identity-stable so the
  // memo isn't broken; call with this entry's path to move it (or the whole selection).
  bindDrag: EntryDragBinder;
};
