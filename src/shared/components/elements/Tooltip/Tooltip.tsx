import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";

import "@/styles/components/Tooltip.css";

import { TOOLTIP_GAP, TOOLTIP_PLACEMENT } from "./constants";
import { computeTooltipPosition } from "./utils";
import type { TooltipCoords, TooltipProps } from "./types";

// Wraps a trigger and shows a floating hint on hover/focus. The body is either a simple
// label + optional hotkey, or arbitrary `content` (e.g. a metadata card). The bubble renders
// in a portal on document.body so it can't be clipped by overflow or trapped inside a stacking
// context, then is measured and clamped to the viewport. Purely visual — the bubble is
// aria-hidden; the trigger keeps its own aria-label for screen readers.
const Tooltip = ({
  label,
  hotkey,
  content,
  contents = false,
  delay = 0,
  showOnFocus = true,
  placement = TOOLTIP_PLACEMENT.BOTTOM,
  disabled = false,
  className,
  children,
}: TooltipProps) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const showTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  // True while the open is scheduled but not yet shown (delay window). Tracked so scroll/resize
  // can cancel a pending open too, not just an already-open bubble.
  const [pending, setPending] = useState(false);
  const [coords, setCoords] = useState<TooltipCoords | null>(null);

  // Once open, measure the (already-rendered) bubble and the trigger to place + clamp it.
  // In `contents` mode the wrapper has no box, so fall back to its child's rect.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    const wrapperRect = trigger.getBoundingClientRect();
    const triggerRect =
      wrapperRect.width || wrapperRect.height
        ? wrapperRect
        : trigger.firstElementChild?.getBoundingClientRect();
    if (!triggerRect) return;

    setCoords(
      computeTooltipPosition(
        triggerRect,
        bubble.getBoundingClientRect(),
        placement,
        TOOLTIP_GAP,
      ),
    );
  }, [open, placement]);

  const clearShowTimer = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  };

  const show = () => {
    if (disabled) return;
    if (delay <= 0) return setOpen(true);
    clearShowTimer();
    setPending(true);
    showTimerRef.current = window.setTimeout(() => {
      setPending(false);
      setOpen(true);
    }, delay);
  };

  const hide = useCallback(() => {
    clearShowTimer();
    setPending(false);
    setOpen(false);
    setCoords(null);
  }, []);

  // Dismiss on Escape, clicking, scroll and resize, so the bubble can't be left orphaned: it
  // renders in a portal with coords measured once, so any layout shift (scrolling a container,
  // resizing the window, the trigger's dialog closing) moves the trigger but not the bubble.
  // Also runs while a show is pending: scrolling during the delay must cancel it, otherwise the
  // bubble pops up after the pointer has already moved on (with no mouseleave to clear it).
  useEffect(() => {
    if (!open && !pending) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === KEY.ESCAPE) hide();
    };
    document.addEventListener("keydown", handleKey);
    // Capture phase so scroll on any nested overflow container is caught, not just the window.
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    // Losing app focus (Cmd+Tab, clicking another window) should drop the bubble too.
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
    };
  }, [open, pending, hide]);

  // Drop any pending show timer when the trigger unmounts.
  useEffect(() => clearShowTimer, []);

  return (
    <span
      ref={triggerRef}
      className={classNames("Tooltip", contents && "contents", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={showOnFocus ? show : undefined}
      onBlur={showOnFocus ? hide : undefined}
      onClick={hide}
    >
      {children}
      {open &&
        !disabled &&
        createPortal(
          <span
            ref={bubbleRef}
            className={classNames(
              "tooltip_bubble",
              !!content && "rich",
              coords && "positioned",
            )}
            style={coords ? { top: coords.top, left: coords.left } : undefined}
            role="tooltip"
            aria-hidden="true"
          >
            {content ?? (
              <>
                {label && <span className="tooltip_label">{label}</span>}
                {hotkey && <kbd className="tooltip_hotkey">{hotkey}</kbd>}
              </>
            )}
          </span>,
          document.body,
        )}
    </span>
  );
};

export default Tooltip;
