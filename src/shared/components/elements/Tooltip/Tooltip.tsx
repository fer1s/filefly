import { useRef, useState } from "react";
import { createPortal } from "react-dom";

import { classNames } from "@/shared/utils";

import "@/styles/components/Tooltip.css";

import { TOOLTIP_GAP, TOOLTIP_PLACEMENT } from "./constants";
import { computeTooltipPosition } from "./utils";
import type { TooltipCoords, TooltipProps } from "./types";

// Wraps a trigger and shows a floating hint (label + optional hotkey) on hover/focus.
// The bubble renders in a portal on document.body so it can't be clipped by overflow or
// trapped inside a stacking context. Purely visual — the bubble is aria-hidden; the trigger
// keeps its own aria-label for screen readers.
const Tooltip = ({
  label,
  hotkey,
  placement = TOOLTIP_PLACEMENT.BOTTOM,
  className,
  children,
}: TooltipProps) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  const show = () => {
    const trigger = triggerRef.current;
    if (trigger)
      setCoords(
        computeTooltipPosition(
          trigger.getBoundingClientRect(),
          placement,
          TOOLTIP_GAP,
        ),
      );
  };

  const hide = () => setCoords(null);

  return (
    <span
      ref={triggerRef}
      className={classNames("Tooltip", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {coords &&
        createPortal(
          <span
            className={classNames("tooltip_bubble", placement)}
            style={{ top: coords.top, left: coords.left }}
            role="tooltip"
            aria-hidden="true"
          >
            <span className="tooltip_label">{label}</span>
            {hotkey && <kbd className="tooltip_hotkey">{hotkey}</kbd>}
          </span>,
          document.body,
        )}
    </span>
  );
};

export default Tooltip;
