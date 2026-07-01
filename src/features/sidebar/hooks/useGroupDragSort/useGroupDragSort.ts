import { useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";

import { DRAG_Z_INDEX } from "./constants";
import type { DragState } from "./types";

// Vertical drag-to-reorder for the sidebar groups. The dragged group follows the pointer (via a
// transform) while the others stay put; on release it computes the drop slot from the measured
// group centers and commits the new order. `registerRef` must be attached to each group's root so
// the drop math can read live positions, and `bind(id)` goes on that group's drag handle.
export const useGroupDragSort = (
  order: string[],
  onReorder: (ids: string[]) => void,
) => {
  const refs = useRef<Partial<Record<string, HTMLElement>>>({});
  const [drag, setDrag] = useState<DragState | null>(null);

  const registerRef = (id: string) => (el: HTMLElement | null) => {
    if (el) refs.current[id] = el;
    else delete refs.current[id];
  };

  // The order that results from dropping `id` after moving it `offsetY` px vertically: count how
  // many other groups' centers the dragged group's projected center has passed.
  const orderAfterDrop = (id: string, offsetY: number) => {
    const centerOf = (gid: string) => {
      const rect = refs.current[gid]?.getBoundingClientRect();
      if (!rect) return null;
      // The dragged element's rect is shifted by the live transform — undo it for the original.
      return rect.top + rect.height / 2 - (gid === id ? offsetY : 0);
    };

    const draggedCenter = centerOf(id);
    if (draggedCenter === null) return order;
    const projected = draggedCenter + offsetY;

    let newIndex = 0;
    order.forEach((gid) => {
      const center = centerOf(gid);
      if (gid !== id && center !== null && center < projected) newIndex++;
    });

    const without = order.filter((gid) => gid !== id);
    without.splice(newIndex, 0, id);
    return without;
  };

  const bind = useDrag(({ args, movement: [, offsetY], active, last }) => {
    const id = args[0] as string;
    if (last) {
      const next = orderAfterDrop(id, offsetY);
      setDrag(null);
      if (next.some((gid, i) => gid !== order[i])) onReorder(next);
    } else if (active) {
      setDrag({ id, offsetY });
    }
  });

  const dragStyle = (id: string) =>
    drag?.id === id
      ? {
          transform: `translateY(${drag.offsetY}px)`,
          position: "relative" as const,
          zIndex: DRAG_Z_INDEX,
        }
      : undefined;

  return { bind, dragStyle, registerRef, draggingId: drag?.id ?? null };
};
