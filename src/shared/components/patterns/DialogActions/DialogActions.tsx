import type { ReactNode } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/DialogActions.css";

// App-level layout adapter around the migrated @sito/ui Button children. This remains a generic
// container because @sito/ui's structured DialogActions couples primary/cancel disabled state,
// while these forms must disable only their invalid primary action. `className` allows layout
// tweaks for special footers (e.g. FolderPicker's left New-Folder slot).
const DialogActions = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={classNames("dialog_actions", className)}>{children}</div>;

export default DialogActions;
