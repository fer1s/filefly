import { classNames } from "@/shared/utils";

import "@/styles/components/IconButton.css";

import Button from "../Button";
import Icon from "../Icon";
import { ICON_BUTTON_SIZE, ICON_BUTTON_VARIANT } from "./constants";
import type { IconButtonProps } from "./types";

const IconButton = ({
  icon,
  variant = ICON_BUTTON_VARIANT.GHOST,
  size = ICON_BUTTON_SIZE.MD,
  className,
  ...props
}: IconButtonProps) => (
  <Button
    className={classNames(
      "IconButton",
      size,
      variant === ICON_BUTTON_VARIANT.BOXED && "boxed",
      className,
    )}
    {...props}
  >
    <Icon icon={icon} />
  </Button>
);

export default IconButton;
