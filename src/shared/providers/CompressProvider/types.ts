// Public shape of the compress/extract context and its dialog.

// Archive format the dialog targets — decides the file extension (backend picks zip vs 7z from it).
export type ArchiveFormat = "zip" | "7z";

export type CompressContextValue = {
  // Open the compress-options dialog for these targets in the given format (default "zip"); resolves
  // the chosen options, or null if the user cancels. The caller (directory file ops) runs the actual
  // compression so it gets the shared status-bar progress + reveal toast.
  requestOptions: (
    targets: string[],
    format?: ArchiveFormat,
  ) => Promise<CompressValues | null>;
  // Prompt for a password to extract an encrypted archive; resolves the entered password, or null
  // if the user cancels.
  requestPassword: () => Promise<string | null>;
};

// Values collected by the compress dialog. `name` already carries the archive extension (.zip/.7z),
// which the backend uses to pick the format. A non-empty `password` encrypts the archive.
export type CompressValues = {
  name: string;
  level: number;
  password?: string;
};

export type CompressDialogProps = {
  visible: boolean;
  defaultName: string;
  // Target extension without the dot ("zip"/"7z"); the dialog keeps the name ending in it.
  ext: string;
  onSubmit: (values: CompressValues) => void;
  onClose: () => void;
};

export type PasswordDialogProps = {
  visible: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
};
