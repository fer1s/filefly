import { classNames } from "@/shared/utils";

import "@/styles/components/IconButton.css";

import Button from "../Button";
import Icon from "../Icon";
import Tooltip from "../Tooltip";
import { ICON_BUTTON_SIZE, ICON_BUTTON_VARIANT } from "./constants";
import type { IconButtonProps } from "./types";

const IconButton = ({
  icon,
  variant = ICON_BUTTON_VARIANT.GHOST,
  size = ICON_BUTTON_SIZE.MD,
  tooltip,
  hotkey,
  tooltipPlacement,
  className,
  ...props
}: IconButtonProps) => {
  const button = (
    <Button
      className={classNames(
        "IconButton",
        size,
        variant === ICON_BUTTON_VARIANT.BOXED && "boxed",
        variant === ICON_BUTTON_VARIANT.DANGER && "danger",
        // Without a tooltip the consumer className lands on the button; with one it goes to
        // the Tooltip wrapper (below) so layout classes keep working on the outer element.
        !tooltip && className,
      )}
      {...props}
    >
      <Icon icon={icon} />
    </Button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip
      label={tooltip}
      hotkey={hotkey}
      placement={tooltipPlacement}
      className={className}
    >
      {button}
    </Tooltip>
  );
};

export default IconButton;
