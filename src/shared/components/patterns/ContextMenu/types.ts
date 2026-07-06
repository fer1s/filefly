import { ReactNode } from "react";

import type { UiColor } from "@/shared/constants";

export interface ContextMenuProps {
  children: ReactNode;
  contextMenuVisible: boolean;
}

// One row inside a hover submenu (see ContextMenuItem.submenu).
export interface ContextMenuSubItem {
  key: string;
  text?: string;
  icon?: ReactNode;
  checked?: boolean;
  disabled?: boolean;
  isSeparator?: boolean;
  onClick?: () => void;
}

export interface ContextMenuItemProps {
  isSeparator?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  text?: string;
  hotkey?: string;
  disabled?: boolean;
  // Semantic color variant (e.g. UI_COLOR.DANGER for permanent delete). Defaults to neutral.
  color?: UiColor;
  // Trailing checkmark reflecting a toggle's state (e.g. "Show Hidden Files" when on).
  checked?: boolean;
  // When set, the row shows a chevron and reveals these rows in a flyout on hover/focus.
  submenu?: ContextMenuSubItem[];
}
