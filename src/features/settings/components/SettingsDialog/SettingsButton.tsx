import type { ButtonHTMLAttributes } from "react";

import Button from "@/shared/components/elements/Button";
import { classNames } from "@/shared/utils";

// A text button styled to match the settings dialog's controls (the "settings_button" chrome:
// select-like border + input surface). Built on the shared Button (type="button" default + ref
// forwarding) but `unstyled` so only the settings chrome applies. Any extra className is merged
// after the base class. Used by the settings custom controls (e.g. the folder chooser and the
// size-ignore "Add" button) instead of a raw <button className="settings_button">.
type SettingsButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const SettingsButton = ({ className, ...rest }: SettingsButtonProps) => (
  <Button
    unstyled
    className={classNames("settings_button", className)}
    {...rest}
  />
);

export default SettingsButton;
