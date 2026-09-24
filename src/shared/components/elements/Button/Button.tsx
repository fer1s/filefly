import { forwardRef } from "react";
import { Button as SitoButton } from "@sito/ui";

import { classNames } from "@/shared/utils";

import "@/styles/components/Button.css";

import {
  BUTTON_VARIANT,
  BUTTON_VARIANT_CLASS,
  SITO_COLOR_BY_BUTTON_VARIANT,
  SITO_VARIANT_BY_BUTTON_VARIANT,
} from "./constants";
import type { ButtonProps } from "./types";

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      type = "button",
      variant = BUTTON_VARIANT.DEFAULT,
      unstyled,
      className,
      ...props
    },
    ref,
  ) => {
    const sharedProps = {
      ...props,
      ref,
      type,
      className: classNames(
        !unstyled && "Button",
        !unstyled && BUTTON_VARIANT_CLASS[variant],
        className,
      ),
    };

    // Bespoke controls opt out of every base visual class. @sito/ui intentionally always applies
    // its own class stack, so preserve this repo's `unstyled` contract with the native element.
    if (unstyled) return <button {...sharedProps} />;

    return (
      <SitoButton
        {...sharedProps}
        variant={SITO_VARIANT_BY_BUTTON_VARIANT[variant]}
        color={SITO_COLOR_BY_BUTTON_VARIANT[variant]}
      />
    );
  },
);

export default Button;
