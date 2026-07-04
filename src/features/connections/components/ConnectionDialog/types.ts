import type { Connection, NewConnection } from "@/shared/services/api";

export type ConnectionDialogProps = {
  visible: boolean;
  // When set, the dialog edits this connection (fields prefilled, id kept stable) instead of
  // creating a new one. Secrets aren't prefilled (they live in the keychain) — leaving them blank
  // keeps the stored ones.
  initial?: Connection | null;
  // Persist the connection. May throw; the dialog surfaces the error and stays open.
  onSubmit: (connection: NewConnection) => Promise<void>;
  onClose: () => void;
};
