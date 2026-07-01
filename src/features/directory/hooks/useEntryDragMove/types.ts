import type { useDrag } from "@use-gesture/react";

import { DirEntry } from "@/shared/models";

// The attributes @use-gesture spreads onto an element (onPointerDown, etc.). The package doesn't
// re-export this type, so recover it from useDrag's binder return type.
export type EntryDragBinder = (path: string) => ReturnType<ReturnType<typeof useDrag>>;

export type UseEntryDragMoveArgs = {
  // Entries currently listed — used to know which drop targets are folders.
  entries: DirEntry[];
  // Current selection: dragging any selected entry moves the whole selection.
  selectedIDs: string[];
  // Called when the drag is released over a valid folder. The caller decides whether to confirm
  // and whether to move or copy (see the drag-and-drop settings).
  onDrop: (sources: string[], destDir: string) => void;
  // Whether a drag starts a native OS drag (so files can be dropped into other apps).
  allowExternalDrag: boolean;
  // Starts the native OS drag with the dragged paths and an optional preview-image file path
  // (a cached thumbnail); falls back to the bundled icon when omitted.
  onDragOut: (sources: string[], icon?: string) => void;
};
