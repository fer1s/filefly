import { classNames } from "@/shared/utils";

import { CHIP_VARIANT, CHIP_SIZE } from "../Chip";
import type { ToggleableChipProps } from "./types";

// A Chip that acts as an on/off toggle — e.g. the search-filter options (kind/date/size). Selected
// = solid (accent) fill, unselected = outline. Renders a real <button> (not the shared Button,
// whose base chrome would fight the pill look) for native keyboard/focus semantics, and reports its
// state via aria-pressed. Reuses the shared `Chip` styles; behavior via `.Chip--toggle`.
const ToggleableChip = ({
  active = false,
  size = CHIP_SIZE.MD,
  className,
  ...props
}: ToggleableChipProps) => (
  <button
    type="button"
    aria-pressed={active}
    className={classNames(
      "Chip",
      "Chip--toggle",
      active ? CHIP_VARIANT.SOLID : CHIP_VARIANT.OUTLINE,
      size,
      className,
    )}
    {...props}
  />
);

export default ToggleableChip;
