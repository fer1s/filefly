import { classNames } from "@/shared/utils";
import { IconButton as SitoIconButton } from "@sito/ui";

import "@/styles/components/IconButton.css";

import Icon from "../Icon";
import Tooltip from "../Tooltip";
import {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
  SITO_ICON_BUTTON_COLOR,
  SITO_ICON_BUTTON_VARIANT,
} from "./constants";
import type { IconButtonProps } from "./types";

const IconButton = ({
  icon,
  variant = ICON_BUTTON_VARIANT.GHOST,
  size = ICON_BUTTON_SIZE.MD,
  tooltip,
  hotkey,
  tooltipPlacement,
  className,
  "aria-label": ariaLabel,
  ...props
}: IconButtonProps) => {
  const color =
    variant === ICON_BUTTON_VARIANT.DANGER
      ? SITO_ICON_BUTTON_COLOR.ERROR
      : SITO_ICON_BUTTON_COLOR.DEFAULT;
  const sitoVariant =
    variant === ICON_BUTTON_VARIANT.BOXED
      ? SITO_ICON_BUTTON_VARIANT.OUTLINED
      : SITO_ICON_BUTTON_VARIANT.TEXT;
  const button = (
    <SitoIconButton
      icon={<Icon icon={icon} />}
      aria-label={ariaLabel ?? tooltip ?? ""}
      color={color}
      variant={sitoVariant}
      size={size}
      className={classNames(
        "Button",
        "IconButton",
        size,
        variant === ICON_BUTTON_VARIANT.BOXED && "boxed",
        variant === ICON_BUTTON_VARIANT.DANGER && "danger",
        // Without a tooltip the consumer className lands on the button; with one it goes to
        // the Tooltip wrapper (below) so layout classes keep working on the outer element.
        !tooltip && className,
      )}
      {...props}
    />
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
