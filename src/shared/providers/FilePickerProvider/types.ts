export type PickFileOptions = {
  // Folder the picker opens at. Omit (or empty) to start at the user's home folder.
  startPath?: string;
  // Restrict selectable files to these extensions (case-insensitive, no dot, e.g. ["toml"]).
  // Omit to allow any file.
  extensions?: readonly string[];
};

export type FilePickerContextValue = {
  // Resolves to the chosen absolute file path, or null if cancelled. Uses the app's own picker
  // when the setting is on, otherwise the native OS (Finder) dialog.
  pickFile: (options?: PickFileOptions) => Promise<string | null>;
};

// A pending picker request held while the dialog is open: where to open and (optionally) which
// extensions to allow.
export type PendingFilePick = {
  startPath: string;
  extensions?: readonly string[];
};
