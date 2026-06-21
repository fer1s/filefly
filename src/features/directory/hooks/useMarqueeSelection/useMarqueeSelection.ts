import { useCallback, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";

import { DRAG_THRESHOLD } from "./constants";
import type { MarqueeRect, UseMarqueeSelectionArgs } from "./types";

// Rubber-band selection: press on empty area and drag to draw a box; entries the
// box intersects become the selection. A plain click (no drag) is left untouched
// so the empty-area click-to-deselect still works.
export const useMarqueeSelection = ({
  containerRef,
  setSelectedIDs,
}: UseMarqueeSelectionArgs) => {
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null);

  const onMouseDown = useCallback(
    (e: ReactMouseEvent) => {
      if (e.button !== 0) return;
      // Only start from empty floor; clicks on an entry are handled by the entry.
      if ((e.target as HTMLElement).closest(".dir_entry_item")) return;

      const container = containerRef.current;
      if (!container) return;

      const startX = e.clientX;
      const startY = e.clientY;
      let active = false;
      let dragged = false;

      const selectWithin = (curX: number, curY: number) => {
        const x1 = Math.min(startX, curX);
        const y1 = Math.min(startY, curY);
        const x2 = Math.max(startX, curX);
        const y2 = Math.max(startY, curY);

        // Visual box, positioned relative to the (scrolling) container content.
        const rect = container.getBoundingClientRect();
        setMarquee({
          left: x1 - rect.left,
          top: y1 - rect.top,
          width: x2 - x1,
          height: y2 - y1,
        });

        // Intersection test in viewport coords (robust under scroll/layout).
        const ids: string[] = [];
        container
          .querySelectorAll<HTMLElement>(".dir_entry_item")
          .forEach((item) => {
            const b = item.getBoundingClientRect();
            const hit = b.left < x2 && b.right > x1 && b.top < y2 && b.bottom > y1;
            if (hit && item.id) ids.push(item.id);
          });
        setSelectedIDs(ids);
      };

      const onMove = (ev: MouseEvent) => {
        if (!active) {
          if (
            Math.abs(ev.clientX - startX) < DRAG_THRESHOLD &&
            Math.abs(ev.clientY - startY) < DRAG_THRESHOLD
          )
            return;
          active = true;
          dragged = true;
          document.body.style.userSelect = "none";
          document.body.style.webkitUserSelect = "none";
        }
        selectWithin(ev.clientX, ev.clientY);
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.userSelect = "";
        document.body.style.webkitUserSelect = "";
        setMarquee(null);

        // Swallow the click that follows a drag so the empty-area onClick does
        // not immediately clear the selection we just built.
        if (dragged)
          window.addEventListener(
            "click",
            (clickEv) => {
              clickEv.stopPropagation();
              clickEv.preventDefault();
            },
            { capture: true, once: true },
          );
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [containerRef, setSelectedIDs],
  );

  return { marquee, onMouseDown };
};
