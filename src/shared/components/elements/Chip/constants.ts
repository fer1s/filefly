// Visual fill of a chip. OUTLINE is the resting look (transparent + border); SOLID is the
// accent-filled look used for a selected/active state (e.g. a ToggleableChip that's on).
export const CHIP_VARIANT = {
  OUTLINE: "outline",
  SOLID: "solid",
} as const;

export type ChipVariant = (typeof CHIP_VARIANT)[keyof typeof CHIP_VARIANT];

export const CHIP_SIZE = {
  SM: "sm",
  MD: "md",
} as const;

export type ChipSize = (typeof CHIP_SIZE)[keyof typeof CHIP_SIZE];
