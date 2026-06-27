import Button from "@/shared/components/elements/Button";

import type { ContextMenuItemProps } from "./types";

export const ContextMenuItem = ({
  isSeparator,
  onClick,
  text,
  icon,
  hotkey,
  disabled,
}: ContextMenuItemProps) => {
  isSeparator = isSeparator || false;

  // Default to disabled when there is no handler; an explicit `disabled` prop overrides.
  const isDisabled = disabled ?? !onClick;

  return isSeparator ? (
    <div className="context_menu_item separator"></div>
  ) : (
    <Button
      className="context_menu_item ctx_button"
      onClick={onClick}
      disabled={isDisabled}
    >
      <span className="ctx_icon">{icon}</span>
      <span className="ctx_text">{text}</span>
      {hotkey && <span className="ctx_hotkey">{hotkey}</span>}
    </Button>
  );
};
