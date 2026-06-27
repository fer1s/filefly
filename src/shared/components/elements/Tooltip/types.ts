import type { ReactNode } from "react";

import type { TooltipPlacement } from "./constants";

export type TooltipCoords = { top: number; left: number };

export type TooltipProps = {
  // Short description of what the wrapped control does. Used as the simple bubble body
  // (with `hotkey`) unless `content` is given.
  label?: string;
  // Optional hotkey hint shown as a small key chip (e.g. "Esc", "←").
  hotkey?: string;
  // Rich bubble body. When set, it replaces the label/hotkey layout (e.g. a metadata card).
  content?: ReactNode;
  // Render the wrapper as `display: contents` so it adds no box of its own — lets the
  // trigger keep its place in a flex/grid layout. Positioning then measures the child.
  contents?: boolean;
  // Hover/focus dwell before showing, in ms (0 = immediate). Avoids flashing on quick passes.
  delay?: number;
  placement?: TooltipPlacement;
  className?: string;
  children: ReactNode;
};
