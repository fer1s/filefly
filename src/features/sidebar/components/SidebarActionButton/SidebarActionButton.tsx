import Button, { BUTTON_VARIANT } from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";

import "@/styles/components/SidebarActionButton.css";

import type { SidebarActionButtonProps } from "./types";

// Full-width sidebar action used for empty-state and edit-mode additions. Keeping icon, label,
// accessibility and chrome together prevents each sidebar call site from styling its own button.
const SidebarActionButton = ({
  icon,
  label,
  className,
  ...props
}: SidebarActionButtonProps) => (
  <Button
    {...props}
    variant={BUTTON_VARIANT.TEXT}
    className={classNames("sidebar_action_button", className)}
    aria-label={label}
  >
    <Icon icon={icon} />
    <span>{label}</span>
  </Button>
);

export default SidebarActionButton;
