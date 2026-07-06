import type { ButtonHTMLAttributes } from "react";

import { classNames } from "@/shared/utils";

// A text button styled to match the settings dialog's controls (the "settings_button" chrome:
// select-like border + input surface). Defaults to type="button" so it never submits an enclosing
// form. Forwards every native button prop (onClick, disabled, aria-*, …); any extra className is
// merged after the base class. Used by the settings custom controls (e.g. the folder chooser and
// the size-ignore "Add" button) instead of a raw <button className="settings_button">.
type SettingsButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const SettingsButton = ({
  type = "button",
  className,
  ...rest
}: SettingsButtonProps) => (
  <button
    type={type}
    className={classNames("settings_button", className)}
    {...rest}
  />
);

export default SettingsButton;
