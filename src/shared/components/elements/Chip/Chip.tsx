import { classNames } from "@/shared/utils";

import "@/styles/components/Chip.css";

import { CHIP_VARIANT, CHIP_SIZE } from "./constants";
import type { ChipProps } from "./types";

// Presentational pill (a <span>). The shared visual base for the interactive variants —
// ToggleableChip (selectable) and DeletableChip (removable value tag) — and usable directly for a
// static label pill. Non-interactive; the variants layer behavior on top of the same `Chip` chrome.
const Chip = ({
  variant = CHIP_VARIANT.OUTLINE,
  size = CHIP_SIZE.MD,
  className,
  ...props
}: ChipProps) => (
  <span className={classNames("Chip", variant, size, className)} {...props} />
);

export default Chip;
