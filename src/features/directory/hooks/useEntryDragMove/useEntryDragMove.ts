import { useCallback, useEffect, useMemo, useRef } from "react";
import { useDrag } from "@use-gesture/react";

import { getThumbnailPath } from "../../thumbnailCache";
import { glyphPngFor } from "../../dragPreview";
import { setOwnDragPaths } from "../../nativeDragSource";
import { entryElementAt } from "../../dropTarget";
import {
  DRAG_OVER_CLASS,
  DRAGGING_BODY_CLASS,
  GHOST_OFFSET,
  DRAG_GHOST_MAX_PILLS,
} from "./constants";
import type { EntryDragBinder, UseEntryDragMoveArgs } from "./types";

// Drag-to-move for directory entries, built on @use-gesture (matching the sidebar's drag-sort).
//
// When external drag is enabled, a drag starts a native OS drag immediately (its preview is the
// grabbed entry's cached thumbnail, or the bundled icon), so one continuous drag works both inside
// the app and into other apps; the folder highlight and drop are driven by the OS drag-drop events
// (see useNativeDropTarget). When it's disabled, the drag stays in-app: a follow-the-pointer ghost
// + hovered-folder highlight resolved on release. Feedback is applied imperatively so a drag never
// re-renders the (heavily memoized) entry rows.
export const useEntryDragMove = ({
  entries,
  selectedIDs,
  onDrop,
  allowExternalDrag,
  onDragOut,
}: UseEntryDragMoveArgs) => {
  const ghostRef = useRef<HTMLDivElement>(null);
  // The entry element currently highlighted as the drop target.
  const targetElRef = useRef<HTMLElement | null>(null);
  // The paths being dragged (the whole selection, or just the grabbed entry).
  const sourcesRef = useRef<string[]>([]);
  // Set once the drag has been handed off to a native OS drag (pointer left the window), so the
  // remaining gesture frames and the release don't also run the in-app drop.
  const handedOffRef = useRef(false);

  const dirPaths = useMemo(
    () => new Set(entries.filter((e) => e.metadata.isDir).map((e) => e.path)),
    [entries],
  );

  const clearTarget = () => {
    targetElRef.current?.classList.remove(DRAG_OVER_CLASS);
    targetElRef.current = null;
  };

  const nameOf = (path: string) =>
    entries.find((e) => e.path === path)?.name ?? path;

  // Build the drag ghost once per drag (Finder-style), so what's being dragged is visible:
  //  - single item → the grabbed entry's icon + its name in a pill.
  //  - multiple    → a red count badge + a stack of name pills (one per item, capped).
  const buildGhost = (sourcePath: string) => {
    const ghost = ghostRef.current;
    if (!ghost) return;
    ghost.innerHTML = "";

    const sources = sourcesRef.current;
    const count = sources.length;

    if (count > 1) {
      const badge = document.createElement("span");
      badge.className = "drag_ghost_count";
      badge.textContent = String(count);
      ghost.appendChild(badge);
    }

    const stack = document.createElement("div");
    stack.className = "drag_ghost_stack";

    if (count === 1) {
      const item = document.createElement("div");
      item.className = "drag_ghost_item";
      const iconEl = document
        .getElementById(sourcePath)
        ?.querySelector<HTMLElement>(".name .icon");
      if (iconEl) item.appendChild(iconEl.cloneNode(true));
      const label = document.createElement("span");
      label.className = "drag_ghost_label";
      label.textContent = nameOf(sourcePath);
      item.appendChild(label);
      stack.appendChild(item);
    } else {
      sources.slice(0, DRAG_GHOST_MAX_PILLS).forEach((p) => {
        const pill = document.createElement("span");
        pill.className = "drag_ghost_label";
        pill.textContent = nameOf(p);
        stack.appendChild(pill);
      });
    }

    ghost.appendChild(stack);
  };

  // The folder element under (x, y), if it's a valid drop target for the current drag: a listed
  // folder that isn't itself a source nor a descendant of one. Hit-tested by geometry (not
  // elementFromPoint) so entries can keep pointer-events:none during the drag — that suppresses
  // their hover tooltip, matching the rubber-band selection.
  const resolveTarget = (x: number, y: number) =>
    entryElementAt(x, y, (el) => {
      const targetPath = el.id;
      if (!targetPath || !dirPaths.has(targetPath)) return false;
      const sources = sourcesRef.current;
      if (sources.includes(targetPath)) return false;
      if (sources.some((s) => targetPath.startsWith(`${s}/`))) return false;
      return true;
    });

  // Ends all in-app drag feedback (highlight + ghost). Shared by the native handoff and release.
  const endDragVisuals = () => {
    clearTarget();
    document.body.classList.remove(DRAGGING_BODY_CLASS);
  };

  const bind = useDrag(
    ({ args, xy: [x, y], first, active, last, event }) => {
      if (first) {
        const sourcePath = args[0] as string;
        // Drag the whole selection when the grabbed entry is part of it, else just that entry.
        sourcesRef.current = selectedIDs.includes(sourcePath)
          ? selectedIDs
          : [sourcePath];
        handedOffRef.current = false;
        // Dismiss any tooltip already open (or pending): pointer capture means the trigger never
        // gets a mouseleave. Tooltips self-dismiss on scroll, so reuse that signal.
        window.dispatchEvent(new Event("scroll"));

        if (allowExternalDrag) {
          // Start the native OS drag straight away, synchronously within this gesture tick (an
          // await here would break the OS latch). Preview = the grabbed entry's cached thumbnail,
          // else its rasterised type glyph, else the bundled icon. The OS owns the gesture from
          // here; highlight and drop (inside the window or back from another app) run via
          // useNativeDropTarget.
          handedOffRef.current = true;
          const entry = entries.find((e) => e.path === sourcePath);
          const icon =
            getThumbnailPath(sourcePath) ??
            (entry ? glyphPngFor(entry) : undefined);
          // Mark these as our own drag so a drop back inside honours the move/copy setting (an
          // external drop copies instead).
          setOwnDragPaths(sourcesRef.current);
          onDragOut(sourcesRef.current, icon);
          sourcesRef.current = [];
          // The OS drag consumes the real pointerup, so @use-gesture's gesture never ends on its
          // own — its leftover state then swallows the next click. Dispatch a synthetic pointerup
          // to terminate the gesture cleanly (fires `last` below) so selection works right after.
          const pointerId = (event as PointerEvent).pointerId;
          window.dispatchEvent(
            new PointerEvent("pointerup", { bubbles: true, pointerId }),
          );
          return;
        }

        buildGhost(sourcePath);
        document.body.classList.add(DRAGGING_BODY_CLASS);
      }

      if (active && !handedOffRef.current) {
        // In-app drag (external disabled): the ghost follows the cursor and the folder under it
        // highlights.
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
        // Native drag already owns it — nothing more to do in-app.
        if (handedOffRef.current) {
          handedOffRef.current = false;
          return;
        }
        const dest = targetElRef.current?.id;
        const sources = sourcesRef.current;
        endDragVisuals();
        if (dest) onDrop(sources, dest);
        sourcesRef.current = [];
      }
    },
    {
      // filterTaps: a click never starts a drag, so entry select / open still work.
      filterTaps: true,
      // keys: false disables @use-gesture's built-in keyboard dragging (arrow keys on a focused
      // entry). Arrows are for navigation only (see useKeyboardNav) — we never drag via keyboard.
      // capture: in external mode the drag is handed to the OS on the first frame, so @use-gesture
      // needs no pointer capture — NOT capturing avoids the webview getting stuck (needing a stray
      // click) when the OS consumes the pointerup. In-app mode keeps capture for reliable tracking.
      pointer: { capture: !allowExternalDrag, keys: false },
    },
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
