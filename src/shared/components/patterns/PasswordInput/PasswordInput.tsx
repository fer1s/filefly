import { forwardRef, useState } from "react";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

import TextInput from "@/shared/components/elements/TextInput";
import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/PasswordInput.css";

import type { PasswordInputProps } from "./types";

// Masked text field with an eye toggle to reveal/hide the value. Wraps the base TextInput so it
// inherits the shared theme-aware styling; the toggle button sits inside the field on the right.
const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggle = true, className, ...props }, ref) => {
    const [revealed, setRevealed] = useState(false);

    return (
      <div className={classNames("PasswordInput", className)}>
        <TextInput
          ref={ref}
          type={revealed ? "text" : "password"}
          className={showToggle ? "PasswordInput_field" : undefined}
          {...props}
        />
        {showToggle && (
          <IconButton
            icon={revealed ? faEyeSlash : faEye}
            className="PasswordInput_toggle"
            tabIndex={-1}
            aria-label={
              revealed ? t.common.hidePassword : t.common.showPassword
            }
            onClick={() => setRevealed((v) => !v)}
          />
        )}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
