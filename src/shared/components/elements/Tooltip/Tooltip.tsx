import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";

import "@/styles/components/Tooltip.css";

import { TOOLTIP_GAP, TOOLTIP_PLACEMENT } from "./constants";
import { computeTooltipPosition } from "./utils";
import type { TooltipCoords, TooltipProps } from "./types";

// Wraps a trigger and shows a floating hint (label + optional hotkey) on hover/focus.
// The bubble renders in a portal on document.body so it can't be clipped by overflow or
// trapped inside a stacking context, then is measured and clamped to the viewport. Purely
// visual — the bubble is aria-hidden; the trigger keeps its own aria-label for screen readers.
const Tooltip = ({
  label,
  hotkey,
  placement = TOOLTIP_PLACEMENT.BOTTOM,
  className,
  children,
}: TooltipProps) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  // Once open, measure the (already-rendered) bubble and the trigger to place + clamp it.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    setCoords(
      computeTooltipPosition(
        trigger.getBoundingClientRect(),
        bubble.getBoundingClientRect(),
        placement,
        TOOLTIP_GAP,
      ),
    );
  }, [open, placement]);

  const show = () => setOpen(true);
  const hide = useCallback(() => {
    setOpen(false);
    setCoords(null);
  }, []);

  // Dismiss on Escape and clicking, so the bubble can't be left orphaned when its trigger's
  // container (e.g. a dialog) closes while the pointer is still over it.
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === KEY.ESCAPE) hide();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, hide]);

  return (
    <span
      ref={triggerRef}
      className={classNames("Tooltip", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={hide}
    >
      {children}
      {open &&
        createPortal(
          <span
            ref={bubbleRef}
            className={classNames("tooltip_bubble", coords && "positioned")}
            style={coords ? { top: coords.top, left: coords.left } : undefined}
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
