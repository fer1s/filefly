import type { ButtonProps } from "@/shared/components/elements/Button";
import type { IconProps } from "@/shared/components/elements/Icon";

export type SidebarActionButtonProps = Omit<
  ButtonProps,
  "aria-label" | "children" | "variant"
> & {
  icon: IconProps["icon"];
  label: string;
};
