// Placement values double as CSS classes (see Tooltip.css), so no mapping is needed.
export const TOOLTIP_PLACEMENT = {
  TOP: "tooltip_top",
  BOTTOM: "tooltip_bottom",
  LEFT: "tooltip_left",
  RIGHT: "tooltip_right",
} as const;

export type TooltipPlacement =
  (typeof TOOLTIP_PLACEMENT)[keyof typeof TOOLTIP_PLACEMENT];

// Gap (px) between the trigger and the tooltip bubble.
export const TOOLTIP_GAP = 8;
