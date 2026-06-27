import { ReactNode } from "react";

export interface ContextMenuProps {
  children: ReactNode;
  contextMenuVisible: boolean;
}

export interface ContextMenuItemProps {
  isSeparator?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  text?: string;
  hotkey?: string;
  disabled?: boolean;
}
