export type ChangelogContextValue = {
  visible: boolean;
  // The version whose notes the dialog opens on (null = the newest entry in the file).
  version: string | null;
  open: (version?: string) => void;
  close: () => void;
};
