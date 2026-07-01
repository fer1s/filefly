import {
  TOOLTIP_PLACEMENT,
  TOOLTIP_VIEWPORT_PADDING,
  type TooltipPlacement,
} from "./constants";
import type { TooltipCoords } from "./types";

// Final viewport (position: fixed) top-left for the bubble, given the trigger and bubble
// rects and placement, clamped so it never spills past the viewport edges.
export const computeTooltipPosition = (
  trigger: DOMRect,
  bubble: DOMRect,
  placement: TooltipPlacement,
  gap: number,
): TooltipCoords => {
  let top: number;
  let left: number;

  switch (placement) {
    case TOOLTIP_PLACEMENT.TOP:
      top = trigger.top - gap - bubble.height;
      left = trigger.left + trigger.width / 2 - bubble.width / 2;
      break;
    case TOOLTIP_PLACEMENT.RIGHT:
      top = trigger.top + trigger.height / 2 - bubble.height / 2;
      left = trigger.right + gap;
      break;
    case TOOLTIP_PLACEMENT.LEFT:
      top = trigger.top + trigger.height / 2 - bubble.height / 2;
      left = trigger.left - gap - bubble.width;
      break;
    case TOOLTIP_PLACEMENT.BOTTOM:
    default:
      top = trigger.bottom + gap;
      left = trigger.left + trigger.width / 2 - bubble.width / 2;
      break;
  }

  const maxLeft = window.innerWidth - bubble.width - TOOLTIP_VIEWPORT_PADDING;
  const maxTop = window.innerHeight - bubble.height - TOOLTIP_VIEWPORT_PADDING;
  left = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(left, maxLeft));
  top = Math.max(TOOLTIP_VIEWPORT_PADDING, Math.min(top, maxTop));

  return { top, left };
};
