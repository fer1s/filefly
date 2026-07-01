export type UseClipboardShortcutsArgs = {
  enabled: boolean;
  selectedIDs: string[];
  onCopy: (targets: string[]) => void;
  onCut: (targets: string[]) => void;
  onPaste: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (targets: string[]) => void;
  onDeletePermanently: (targets: string[]) => void;
  onRename: (targets: string[]) => void;
  onNewFolder: () => void;
  onSelectAll: () => void;
  onOpenInTerminal: () => void;
  onProperties: () => void;
};
