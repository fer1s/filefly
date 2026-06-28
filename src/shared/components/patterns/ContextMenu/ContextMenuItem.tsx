import Button from "@/shared/components/elements/Button";
import { classNames } from "@/shared/utils";
import { UI_COLOR } from "@/shared/constants";

import type { ContextMenuItemProps } from "./types";

export const ContextMenuItem = ({
  isSeparator,
  onClick,
  text,
  icon,
  hotkey,
  disabled,
  color = UI_COLOR.DEFAULT,
}: ContextMenuItemProps) => {
  isSeparator = isSeparator || false;

  // Default to disabled when there is no handler; an explicit `disabled` prop overrides.
  const isDisabled = disabled ?? !onClick;

  return isSeparator ? (
    <div className="context_menu_item separator"></div>
  ) : (
    <Button
      className={classNames(
        "context_menu_item ctx_button",
        color !== UI_COLOR.DEFAULT && `ctx_${color}`,
      )}
      onClick={onClick}
      disabled={isDisabled}
    >
      <span className="ctx_icon">{icon}</span>
      <span className="ctx_text">{text}</span>
      {hotkey && <span className="ctx_hotkey">{hotkey}</span>}
    </Button>
  );
};
