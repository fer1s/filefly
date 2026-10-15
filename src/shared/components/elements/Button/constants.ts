import {
  BUTTON_COLOR_VARIANTS as SITO_BUTTON_COLOR_VARIANT,
  BUTTON_VARIANTS as SITO_BUTTON_VARIANT,
} from "@sito/ui";

// App-facing button variants. Consumers use this contract instead of coupling themselves to
// @sito/ui; the wrapper below owns how each semantic Sito File Browser style maps to the package.
export const BUTTON_VARIANT = {
  DEFAULT: "default",
  TEXT: "text",
  PRIMARY: "primary",
  OUTLINED: "outlined",
} as const;

export type ButtonVariant =
  (typeof BUTTON_VARIANT)[keyof typeof BUTTON_VARIANT];

export const BUTTON_VARIANT_CLASS: Record<ButtonVariant, string> = {
  [BUTTON_VARIANT.DEFAULT]: "button_default",
  [BUTTON_VARIANT.TEXT]: "button_text",
  [BUTTON_VARIANT.PRIMARY]: "button_primary",
  [BUTTON_VARIANT.OUTLINED]: "button_outlined",
};

export const SITO_VARIANT_BY_BUTTON_VARIANT = {
  [BUTTON_VARIANT.DEFAULT]: SITO_BUTTON_VARIANT.TEXT,
  [BUTTON_VARIANT.TEXT]: SITO_BUTTON_VARIANT.TEXT,
  [BUTTON_VARIANT.PRIMARY]: SITO_BUTTON_VARIANT.SUBMIT,
  [BUTTON_VARIANT.OUTLINED]: SITO_BUTTON_VARIANT.OUTLINED,
} as const;

export const SITO_COLOR_BY_BUTTON_VARIANT = {
  [BUTTON_VARIANT.DEFAULT]: SITO_BUTTON_COLOR_VARIANT.DEFAULT,
  [BUTTON_VARIANT.TEXT]: SITO_BUTTON_COLOR_VARIANT.DEFAULT,
  [BUTTON_VARIANT.PRIMARY]: SITO_BUTTON_COLOR_VARIANT.PRIMARY,
  [BUTTON_VARIANT.OUTLINED]: SITO_BUTTON_COLOR_VARIANT.DEFAULT,
} as const;
