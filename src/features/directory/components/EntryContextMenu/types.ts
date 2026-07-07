import type { RefObject } from "react";

import type { EntryKind } from "@/features/directory/constants";

export type FileOps = {
  copy: (targets: string[]) => void;
  copyPath: (targets: string[]) => void;
  cut: (targets: string[]) => void;
  remove: (targets: string[]) => Promise<void>;
  removePermanently: (targets: string[]) => Promise<void>;
  restore: (targets: string[]) => Promise<void>;
  paste: () => Promise<void>;
  compress: (
    targets: string[],
    options: { name: string; level: number },
  ) => Promise<void>;
  extract: (archivePath: string) => Promise<void>;
};

export type EntryContextMenuProps = {
  contextMenuRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
  onClose: () => void;
  elementId: string;
  elementType: EntryKind;
  isCurrentDirectory: boolean;
  // The current folder is the Trash: entries offer Restore / permanent delete, not Move-to-Trash.
  inTrash: boolean;
  selectedIDs: string[];
  canPaste: boolean;
  fileOps: FileOps;
  onStartRename: (id: string) => void;
  onPreview: (id: string) => void;
  onProperties: (id: string, isCurrentDirectory: boolean) => void;
};

export type TagPickerProps = {
  // The entries the menu acts on (the clicked one, or the whole selection).
  targets: string[];
  onClose: () => void;
};
