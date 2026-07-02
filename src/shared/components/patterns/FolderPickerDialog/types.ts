export type FolderPickerDialogProps = {
  visible: boolean;
  // Folder the picker opens at. Empty string starts at the Locations (volumes) root.
  initialPath: string;
  // Called with the chosen absolute folder path.
  onChoose: (path: string) => void;
  onClose: () => void;
};

// A row in the picker: a folder or a volume, both addressed by absolute path.
export type PickerEntry = {
  name: string;
  path: string;
};
