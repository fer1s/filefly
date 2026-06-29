export const ICON_BUTTON_VARIANT = {
  GHOST: "ghost",
  BOXED: "boxed",
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
