import type { ReactNode } from "react";

// Options for one confirmation prompt. Mirrors the styling knobs of ConfirmationDialog.
export type ConfirmOptions = {
  title: string;
  message: ReactNode;
  // Default to the shared "Confirm" / "Cancel" labels when omitted.
  confirmLabel?: string;
  cancelLabel?: string;
  // Colour the confirm button as a destructive action (e.g. delete).
  destructive?: boolean;
};

export type ConfirmContextValue = {
  // Open the app's confirmation dialog; resolves true on confirm, false on cancel/escape/backdrop.
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};
