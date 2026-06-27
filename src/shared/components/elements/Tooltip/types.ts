import type { ReactNode } from "react";

import type { TooltipPlacement } from "./constants";

export type TooltipCoords = { top: number; left: number };

export type TooltipProps = {
  // Short description of what the wrapped control does.
  label: string;
  // Optional hotkey hint shown as a small key chip (e.g. "Esc", "←").
  hotkey?: string;
  placement?: TooltipPlacement;
  className?: string;
  children: ReactNode;
};
