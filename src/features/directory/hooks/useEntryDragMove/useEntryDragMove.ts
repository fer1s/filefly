import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDrag } from "@use-gesture/react";

import {
  DRAG_OVER_CLASS,
  DRAGGING_BODY_CLASS,
  GHOST_OFFSET,
} from "./constants";
import type { EntryDragBinder, UseEntryDragMoveArgs } from "./types";

// Drag-to-move for directory entries, built on @use-gesture (matching the sidebar's drag-sort).
// HTML5 dnd is avoided so it behaves consistently with the app's other pointer gestures.
//
// There is no native "drop" event, so the folder under the pointer is found with
// elementFromPoint on release. All in-flight feedback (the follow-the-pointer ghost and the
// hovered-folder highlight) is applied imperatively via refs, so a drag never re-renders the
// (heavily memoized) entry rows.
export const useEntryDragMove = ({
  entries,
  selectedIDs,
  onDrop,
}: UseEntryDragMoveArgs) => {
  const ghostRef = useRef<HTMLDivElement>(null);
  // The entry element currently highlighted as the drop target.
  const targetElRef = useRef<HTMLElement | null>(null);
  // The paths being dragged (the whole selection, or just the grabbed entry).
  const sourcesRef = useRef<string[]>([]);

  const dirPaths = useMemo(
    () =>
      new Set(entries.filter((e) => e.metadata.isDir).map((e) => e.path)),
    [entries],
  );

  const clearTarget = () => {
    targetElRef.current?.classList.remove(DRAG_OVER_CLASS);
    targetElRef.current = null;
  };

  // Build the drag ghost once per drag: a clone of the grabbed entry's icon plus its name in a
  // pill (Finder-style), so what's being dragged is literally visible in both list and grid.
  // A stacked count badge is added when the whole selection is being moved.
  const buildGhost = (sourcePath: string) => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.innerHTML = "";

    const iconEl = document
      .getElementById(sourcePath)
      ?.querySelector<HTMLElement>(".name .icon");
    const name = entries.find((e) => e.path === sourcePath)?.name ?? "";

    const item = document.createElement("div");
    item.className = "drag_ghost_item";
    if (iconEl) item.appendChild(iconEl.cloneNode(true));
    const label = document.createElement("span");
    label.className = "drag_ghost_label";
    label.textContent = name;
    item.appendChild(label);
    ghost.appendChild(item);

    const count = sourcesRef.current.length;
    if (count > 1) {
      const badge = document.createElement("span");
      badge.className = "drag_ghost_count";
      badge.textContent = String(count);
      ghost.appendChild(badge);
    }
  };

  // The folder element under (x, y), if it's a valid drop target for the current drag: a listed
  // folder that isn't itself a source nor a descendant of one. Hit-tested by geometry (not
  // elementFromPoint) so entries can keep pointer-events:none during the drag — that suppresses
  // their hover tooltip, matching the rubber-band selection.
  const resolveTarget = (x: number, y: number) => {
    const items = document.querySelectorAll<HTMLElement>(".dir_entry_item");
    for (const el of items) {
      const b = el.getBoundingClientRect();
      if (x < b.left || x > b.right || y < b.top || y > b.bottom) continue;
      const targetPath = el.id;
      if (!targetPath || !dirPaths.has(targetPath)) return null;
      const sources = sourcesRef.current;
      if (sources.includes(targetPath)) return null;
      if (sources.some((s) => targetPath.startsWith(`${s}/`))) return null;
      return el;
    }
    return null;
  };

  const bind = useDrag(
    ({ args, xy: [x, y], first, active, last }) => {
      if (first) {
        const sourcePath = args[0] as string;
        // Drag the whole selection when the grabbed entry is part of it, else just that entry.
        sourcesRef.current = selectedIDs.includes(sourcePath)
          ? selectedIDs
          : [sourcePath];
        buildGhost(sourcePath);
        document.body.classList.add(DRAGGING_BODY_CLASS);
        // Dismiss any tooltip already open (or pending) when the drag starts: pointer capture
        // means the trigger never gets a mouseleave. Tooltips self-dismiss on scroll, so reuse
        // that signal rather than reaching into their state.
        window.dispatchEvent(new Event("scroll"));
      }

      if (active) {
        const ghost = ghostRef.current;
        if (ghost)
          ghost.style.transform = `translate3d(${x + GHOST_OFFSET}px, ${
            y + GHOST_OFFSET
          }px, 0)`;
        const el = resolveTarget(x, y);
        if (el !== targetElRef.current) {
          clearTarget();
          if (el) {
            el.classList.add(DRAG_OVER_CLASS);
            targetElRef.current = el;
          }
        }
      }

      if (last) {
        const dest = targetElRef.current?.id;
        const sources = sourcesRef.current;
        clearTarget();
        document.body.classList.remove(DRAGGING_BODY_CLASS);
        if (dest) onDrop(sources, dest);
        sourcesRef.current = [];
      }
    },
    // filterTaps: a click never starts a drag, so entry select / open still work.
    { filterTaps: true },
  );

  // Stable wrapper: useDrag returns a fresh `bind` each render, but entry rows are memoized, so
  // they must receive an identity-stable binder. This always calls the latest `bind` via a ref.
  // The ref is synced in an effect (never written during render); the binder only runs on user
  // interaction, well after effects flush, so it always sees the current `bind`.
  const bindRef = useRef(bind);
  useEffect(() => {
    bindRef.current = bind;
  });
  const bindDrag = useCallback<EntryDragBinder>(
    (path) => bindRef.current(path),
    [],
  );

  return { bindDrag, ghostRef };
};
