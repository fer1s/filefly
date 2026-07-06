import type { ReactNode } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/DialogActions.css";

// The standard right-aligned action row for a dialog footer (Cancel / Confirm, etc.). Centralizes
// button sizing + spacing so every dialog matches — use this instead of a per-dialog actions class.
// `className` allows layout tweaks for special footers (e.g. FolderPicker's left New-Folder slot).
const DialogActions = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div className={classNames("dialog_actions", className)}>{children}</div>
);

export default DialogActions;
