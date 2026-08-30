import type { ButtonProps as SitoButtonProps } from "@sito/ui";

import type { ButtonVariant } from "./constants";

export interface ButtonProps extends Omit<
  SitoButtonProps,
  "color" | "size" | "variant"
> {
  variant?: ButtonVariant;
  // Skip the base `.Button` look and style purely from `className`. For buttons that carry their own
  // bespoke styling (nav items, list rows, stat chips, icon toggles) but still want the shared
  // element's `type="button"` default + ref forwarding.
  unstyled?: boolean;
}
