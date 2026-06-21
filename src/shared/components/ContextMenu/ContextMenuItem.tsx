import { classNames } from "@/shared/utils";

import type { ContextMenuItemProps } from "./types";

export const ContextMenuItem = ({
  isSeparator,
  onClick,
  text,
  icon,
  disabled,
}: ContextMenuItemProps) => {
  isSeparator = isSeparator || false;

  // Default to disabled when there is no handler; an explicit `disabled` prop overrides.
  const isDisabled = disabled ?? !onClick;

  return isSeparator ? (
    <div className="context_menu_item separator"></div>
  ) : (
    <button
      className="context_menu_item ctx_button"
      onClick={onClick}
      disabled={isDisabled}
    >
      <span className="ctx_icon">{icon}</span>
      <span className="ctx_text">{text}</span>
    </button>
  );
};
