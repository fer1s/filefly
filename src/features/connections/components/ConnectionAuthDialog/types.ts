import type { Connection } from "@/shared/services/api";

export type ConnectionAuthDialogProps = {
  // The connection that failed auth (null hides the dialog).
  connection: Connection | null;
  // Retry opening it, optionally storing `secret` (as password + key passphrase). May throw; the
  // dialog surfaces the error and stays open. Empty secret just re-attempts (ssh-agent case).
  onRetry: (secret: string) => Promise<void>;
  onClose: () => void;
};
