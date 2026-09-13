export const ICON_BUTTON_VARIANT = {
  GHOST: "ghost",
  BOXED: "boxed",
  DANGER: "danger",
} as const;

export type IconButtonVariant =
  (typeof ICON_BUTTON_VARIANT)[keyof typeof ICON_BUTTON_VARIANT];

export const ICON_BUTTON_SIZE = {
  SM: "sm",
  MD: "md",
  LG: "lg",
} as const;

export type IconButtonSize =
  (typeof ICON_BUTTON_SIZE)[keyof typeof ICON_BUTTON_SIZE];

// Adapter values for the @sito/ui primitive. The app-facing variants above stay stable while the
// wrapper maps them onto the package's generic variant/colour contract.
export const SITO_ICON_BUTTON_VARIANT = {
  TEXT: "text",
  OUTLINED: "outlined",
} as const;

export const SITO_ICON_BUTTON_COLOR = {
  DEFAULT: "default",
  ERROR: "error",
} as const;
