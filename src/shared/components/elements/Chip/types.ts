import type { HTMLAttributes } from "react";

import type { ChipVariant, ChipSize } from "./constants";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: ChipVariant;
  size?: ChipSize;
};
