import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { classNames } from "@/shared/utils";

import Chip, { CHIP_VARIANT } from "../Chip";
import IconButton, { ICON_BUTTON_SIZE, ICON_BUTTON_VARIANT } from "../IconButton";
import type { DeletableChipProps } from "./types";

// A Chip that displays a value with a trailing × to remove it — e.g. an entry in an editable list
// (the size-ignore patterns). Not a toggle: the pill itself is inert; only the × acts. Always the
// OUTLINE variant; layout tweaks (room for the button) come from `.Chip--deletable`.
const DeletableChip = ({
  children,
  onDelete,
  removeLabel,
  size,
  className,
}: DeletableChipProps) => (
  <Chip
    variant={CHIP_VARIANT.OUTLINE}
    size={size}
    className={classNames("Chip--deletable", className)}
  >
    <span className="Chip_label">{children}</span>
    <IconButton
      icon={faXmark}
      size={ICON_BUTTON_SIZE.SM}
      variant={ICON_BUTTON_VARIANT.DANGER}
      tooltip={removeLabel}
      aria-label={removeLabel}
      onClick={onDelete}
    />
  </Chip>
);

export default DeletableChip;
