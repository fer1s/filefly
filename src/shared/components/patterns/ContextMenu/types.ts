import { ReactNode } from "react";

import type { UiColor } from "@/shared/constants";

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
  // Semantic color variant (e.g. UI_COLOR.DANGER for permanent delete). Defaults to neutral.
  color?: UiColor;
}
