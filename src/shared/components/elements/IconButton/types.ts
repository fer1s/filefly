import type { ButtonProps } from "../Button";
import type { IconProps } from "../Icon";

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  icon: IconProps["icon"];
};
