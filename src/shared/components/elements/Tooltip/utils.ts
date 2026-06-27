import { TOOLTIP_PLACEMENT, type TooltipPlacement } from "./constants";
import type { TooltipCoords } from "./types";

// Viewport (position: fixed) coordinates for the bubble's anchor point, given the trigger's
// rect and placement. The bubble's own CSS transform handles centering from this point.
export const computeTooltipPosition = (
  rect: DOMRect,
  placement: TooltipPlacement,
  gap: number,
): TooltipCoords => {
  switch (placement) {
    case TOOLTIP_PLACEMENT.TOP:
      return { top: rect.top - gap, left: rect.left + rect.width / 2 };
    case TOOLTIP_PLACEMENT.RIGHT:
      return { top: rect.top + rect.height / 2, left: rect.right + gap };
    case TOOLTIP_PLACEMENT.LEFT:
      return { top: rect.top + rect.height / 2, left: rect.left - gap };
    case TOOLTIP_PLACEMENT.BOTTOM:
    default:
      return { top: rect.bottom + gap, left: rect.left + rect.width / 2 };
  }
};
