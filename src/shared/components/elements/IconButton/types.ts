import type { ButtonProps } from "../Button";
import type { IconProps } from "../Icon";
import type { TooltipPlacement } from "../Tooltip";
import type { IconButtonVariant, IconButtonSize } from "./constants";

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  icon: IconProps["icon"];
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  // When set, the button is wrapped in a Tooltip showing this label (and optional hotkey).
  tooltip?: string;
  hotkey?: string;
  tooltipPlacement?: TooltipPlacement;
};
