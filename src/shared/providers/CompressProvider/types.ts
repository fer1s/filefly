// Public shape of the compress/extract context and its dialog.

export type CompressContextValue = {
  // Open the compress-options dialog for these targets; resolves the chosen options, or null if the
  // user cancels. The caller (directory file ops) runs the actual compression so it gets the shared
  // status-bar progress + reveal toast.
  requestOptions: (targets: string[]) => Promise<CompressValues | null>;
  // Prompt for a password to extract an encrypted archive; resolves the entered password, or null
  // if the user cancels.
  requestPassword: () => Promise<string | null>;
};

// Values collected by the compress dialog. `name` already carries the `.zip` extension. A non-empty
// `password` encrypts the archive (AES-256).
export type CompressValues = {
  name: string;
  level: number;
  password?: string;
};

export type CompressDialogProps = {
  visible: boolean;
  defaultName: string;
  onSubmit: (values: CompressValues) => void;
  onClose: () => void;
};

export type PasswordDialogProps = {
  visible: boolean;
  onSubmit: (password: string) => void;
  onClose: () => void;
};
