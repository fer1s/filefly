import type { RefObject } from "react";

import type { EntryKind } from "@/shared/constants";

export type FileOps = {
  copy: (targets: string[]) => void;
  cut: (targets: string[]) => void;
  remove: (targets: string[]) => Promise<void>;
  removePermanently: (targets: string[]) => Promise<void>;
  paste: () => Promise<void>;
};

export type EntryContextMenuProps = {
  contextMenuRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
  onClose: () => void;
  elementId: string;
  elementType: EntryKind;
  isCurrentDirectory: boolean;
  selectedIDs: string[];
  canPaste: boolean;
  fileOps: FileOps;
  onStartRename: (id: string) => void;
  onPreview: (id: string) => void;
  onProperties: (id: string, isCurrentDirectory: boolean) => void;
};
