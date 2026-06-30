import type { ReactNode } from "react";

export type ConfirmationDialogProps = {
  visible: boolean;
  title: string;
  message: ReactNode;
  // Defaults to the shared "Confirm" / "Cancel" labels when omitted.
  confirmLabel?: string;
  cancelLabel?: string;
  // Styles the confirm button as a destructive action (danger colour).
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};
