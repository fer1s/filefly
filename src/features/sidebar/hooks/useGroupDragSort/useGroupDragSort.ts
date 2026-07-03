import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useDrag } from "@use-gesture/react";

import type { DragState, GroupGeom } from "./types";

// Vertical layout snapshot (viewport y) of one group, captured at drag start.
const measure = (el: HTMLElement): GroupGeom => {
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    bottom: r.bottom,
    center: r.top + r.height / 2,
    height: r.height,
  };
};

// Clamp the raw pointer offset so the dragged group can't leave the list — its top edge stops at
// the first group's top and its bottom edge at the last group's bottom.
const clampDy = (geom: GroupGeom[], index: number, my: number): number => {
  const el = geom[index];
  const minDy = geom[0].top - el.top;
  const maxDy = geom[geom.length - 1].bottom - el.bottom;
  return Math.max(minDy, Math.min(maxDy, my));
};

// Target slot for the dragged group: the count of other groups whose center sits above the
// pointer-projected center. Uses the RAW offset so intent isn't capped by the visual clamp.
const dropIndex = (geom: GroupGeom[], index: number, my: number): number => {
  const draggedCenter = geom[index].center + my;
  let target = 0;
  geom.forEach((g, i) => {
    if (i !== index && g.center < draggedCenter) target += 1;
  });
  return target;
};

// Vertical drag-to-reorder for the sidebar groups, mirroring the tab strip: the dragged group
// follows the pointer while the groups between its origin and the live target slot slide to open
// the gap (transform only — layout is untouched until the drop commits the new order). `registerRef`
// must be attached to each group's root so the drag-start snapshot can read live positions, and
// `bind(id)` goes on that group's drag handle.
export const useGroupDragSort = (
  order: string[],
  onReorder: (ids: string[]) => void,
) => {
  const refs = useRef<Partial<Record<string, HTMLElement>>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  // True for the single frame after a drop: the reorder just committed, so the shifted groups are
  // already at their final slots and must reset their transform WITHOUT animating.
  const [snapping, setSnapping] = useState(false);

  const registerRef = (id: string) => (el: HTMLElement | null) => {
    if (el) refs.current[id] = el;
    else delete refs.current[id];
  };

  // Re-enable transitions the frame after a drop, once the no-transition commit has painted.
  useEffect(() => {
    if (!snapping) return;
    const raf = requestAnimationFrame(() => setSnapping(false));
    return () => cancelAnimationFrame(raf);
  }, [snapping]);

  const bind = useDrag(
    ({ args, movement: [, my], first, last, memo }) => {
      const id = args[0] as string;
      if (first) {
        // Snapshot the resting layout of the currently-rendered groups (some, e.g. Tags, may be
        // hidden and thus unregistered), in display order.
        const ids = order.filter((gid) => refs.current[gid]);
        const geom = ids.map((gid) => measure(refs.current[gid]!));
        const index = ids.indexOf(id);
        if (index === -1) return;
        const state: DragState = {
          ids,
          geom,
          index,
          dy: clampDy(geom, index, my),
          my,
        };
        setDrag(state);
        return state;
      }
      // `memo` carries the drag-start snapshot across frames so render never re-measures.
      const state = memo as DragState | undefined;
      if (!state) return;
      const dy = clampDy(state.geom, state.index, my);
      if (last) {
        const target = dropIndex(state.geom, state.index, my);
        const nextVisible = state.ids.filter((gid) => gid !== id);
        nextVisible.splice(target, 0, id);
        // Merge the reordered visible groups back into the full order, leaving hidden groups in
        // their original slots.
        let v = 0;
        const next = order.map((gid) =>
          state.ids.includes(gid) ? nextVisible[v++] : gid,
        );
        setDrag(null);
        setSnapping(true);
        if (next.some((gid, i) => gid !== order[i])) onReorder(next);
        return;
      }
      setDrag({ ...state, dy, my });
      return state;
    },
    // keys: false disables @use-gesture's built-in keyboard dragging (arrow keys on a focused group).
    { axis: "y", filterTaps: true, pointer: { keys: false } },
  );

  // Live target slot + the gap the lifted group leaves (its own height + the inter-group margin).
  const target = drag ? dropIndex(drag.geom, drag.index, drag.my) : null;
  const gap =
    drag && drag.geom.length > 1 ? drag.geom[1].top - drag.geom[0].bottom : 0;
  const shift = drag ? drag.geom[drag.index].height + gap : 0;

  // Each group's live y-shift: the dragged one follows the pointer; groups between its origin and
  // the target slide by `shift` to open the gap (up when dragging down, down when dragging up).
  const translateFor = (visibleIndex: number): number => {
    if (!drag || target === null) return 0;
    const from = drag.index;
    if (visibleIndex === from) return drag.dy;
    if (target > from && visibleIndex > from && visibleIndex <= target)
      return -shift;
    if (target < from && visibleIndex >= target && visibleIndex < from)
      return shift;
    return 0;
  };

  const styleFor = (id: string): CSSProperties | undefined => {
    if (!drag) return undefined;
    const i = drag.ids.indexOf(id);
    if (i === -1) return undefined;
    const ty = translateFor(i);
    if (id !== drag.ids[drag.index] && ty === 0) return undefined;
    return { transform: `translateY(${ty}px)` };
  };

  return {
    bind,
    registerRef,
    styleFor,
    snapping,
    draggingId: drag ? drag.ids[drag.index] : null,
  };
};
