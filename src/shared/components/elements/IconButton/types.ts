import type { ButtonProps } from "../Button";
import type { IconProps } from "../Icon";
import type { IconButtonVariant, IconButtonSize } from "./constants";

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  icon: IconProps["icon"];
  variant?: IconButtonVariant;
  size?: IconButtonSize;
};
