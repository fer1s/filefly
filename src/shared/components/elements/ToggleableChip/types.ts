import type { ButtonHTMLAttributes } from "react";

import type { ChipSize } from "../Chip";

export type ToggleableChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  // Whether the chip is currently selected. Drives the solid (accent) fill and aria-pressed.
  active?: boolean;
  size?: ChipSize;
};
