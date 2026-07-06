import type { ReactNode } from "react";

import type { ChipSize } from "../Chip";

export type DeletableChipProps = {
  children: ReactNode;
  // Called when the trailing × button is clicked.
  onDelete: () => void;
  // Accessible label / tooltip for the × button (e.g. "Remove pattern").
  removeLabel: string;
  size?: ChipSize;
  className?: string;
};
