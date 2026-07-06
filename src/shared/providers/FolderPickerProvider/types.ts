export type PickFolderOptions = {
  // Folder the picker opens at. Omit (or empty) to start at the Locations (volumes) root.
  startPath?: string;
};

export type FolderPickerContextValue = {
  // Resolves to the chosen absolute folder path, or null if cancelled. Uses the app's own picker
  // when the setting is on, otherwise the native OS (Finder) dialog.
  pickFolder: (options?: PickFolderOptions) => Promise<string | null>;
};
