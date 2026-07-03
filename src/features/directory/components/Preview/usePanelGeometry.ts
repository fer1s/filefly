import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useDrag } from "@use-gesture/react";

import { PANEL_MARGIN, PANEL_MIN_W, PANEL_MIN_H } from "./constants";
import { clampNum } from "./utils";
import type { Geom, ResizeDir } from "./types";

// Owns the preview panel's position/size: resting geometry per file type, drag-by-header, edge/
// corner resize, and double-click maximize. Returns the inline style + interaction flags the
// container needs plus the two @use-gesture binders.
export const usePanelGeometry = ({
  previewVisible,
  isBig,
}: {
  previewVisible: boolean;
  isBig: boolean;
}) => {
  // Default resting geometry for the current file type (anchored top-right like the old layout).
  const defaultGeom = useCallback((): Geom => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const width = isBig ? vw - 2 * PANEL_MARGIN : Math.round(vw * 0.45);
    const height = vh - 2 * PANEL_MARGIN;
    return {
      left: isBig ? PANEL_MARGIN : vw - PANEL_MARGIN - width,
      top: PANEL_MARGIN,
      width,
      height,
    };
  }, [isBig]);

  const [geom, setGeom] = useState<Geom>(defaultGeom);
  const [maximized, setMaximized] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const restoreGeom = useRef<Geom | null>(null);

  // Recentre/reset each time the preview (re)opens — derived from the prop by comparing to state
  // during render (no ref/effect, to satisfy the strict hooks lint).
  const [wasVisible, setWasVisible] = useState(previewVisible);
  if (previewVisible !== wasVisible) {
    setWasVisible(previewVisible);
    if (previewVisible) {
      setGeom(defaultGeom());
      setMaximized(false);
    }
  }

  // Keep the panel inside the viewport when the window resizes (refit if maximized, else clamp).
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setGeom((g) =>
        maximized
          ? {
              left: PANEL_MARGIN,
              top: PANEL_MARGIN,
              width: vw - 2 * PANEL_MARGIN,
              height: vh - 2 * PANEL_MARGIN,
            }
          : {
              width: Math.min(g.width, vw - 2 * PANEL_MARGIN),
              height: Math.min(g.height, vh - 2 * PANEL_MARGIN),
              left: clampNum(g.left, 0, Math.max(0, vw - g.width)),
              top: clampNum(g.top, 0, Math.max(0, vh - g.height)),
            },
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [maximized]);

  // Drag-by-header: move the panel (clamped to the viewport) by grabbing its title bar.
  const dragBind = useDrag(
    ({ event, movement: [mx, my], first, last, memo, cancel, tap }) => {
      // A click/tap (incl. the two that make a double-click) isn't a move — do nothing.
      if (tap) return memo;
      if (
        first &&
        (event.target as HTMLElement).closest(
          "button, a, input, textarea, select, .mac_close",
        )
      ) {
        cancel();
        return;
      }
      // memo is unset on the first move (and after a cancel/tap); fall back to the live geometry so
      // a stray non-first event never dereferences undefined and crashes the view.
      const base = (
        first || !memo ? { left: geom.left, top: geom.top } : memo
      ) as { left: number; top: number };
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setGeom((g) => ({
        ...g,
        left: clampNum(base.left + mx, 0, Math.max(0, vw - g.width)),
        top: clampNum(base.top + my, 0, Math.max(0, vh - g.height)),
      }));
      setInteracting(!last);
      // Drop any stray text selection the drag started before the no-select class took effect.
      window.getSelection?.()?.removeAllRanges();
      return base;
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  // Resize handles: one binder, each handle passes which edges it drives via args.
  const resizeBind = useDrag(
    ({ args, movement: [mx, my], first, last, memo, tap }) => {
      if (tap) return memo;
      const dir = args[0] as ResizeDir;
      const base = (first || !memo ? geom : memo) as Geom;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let { left, top, width, height } = base;
      if (dir.r) width = clampNum(base.width + mx, PANEL_MIN_W, vw - base.left);
      if (dir.b) height = clampNum(base.height + my, PANEL_MIN_H, vh - base.top);
      if (dir.l) {
        const right = base.left + base.width;
        left = clampNum(base.left + mx, 0, right - PANEL_MIN_W);
        width = right - left;
      }
      if (dir.t) {
        const bottom = base.top + base.height;
        top = clampNum(base.top + my, 0, bottom - PANEL_MIN_H);
        height = bottom - top;
      }
      setGeom({ left, top, width, height });
      setInteracting(!last);
      setMaximized(false);
      // Drop any stray text selection the resize started before the no-select class took effect.
      window.getSelection?.()?.removeAllRanges();
      return base;
    },
    { filterTaps: true, pointer: { keys: false } },
  );

  // Double-click the header → toggle a maximized layout that fills the viewport (minus the inset),
  // storing the prior geometry to restore on the next toggle.
  const toggleMaximize = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, a, input, .mac_close"))
        return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (maximized) {
        setGeom(restoreGeom.current ?? defaultGeom());
        setMaximized(false);
      } else {
        restoreGeom.current = geom;
        setGeom({
          left: PANEL_MARGIN,
          top: PANEL_MARGIN,
          width: vw - 2 * PANEL_MARGIN,
          height: vh - 2 * PANEL_MARGIN,
        });
        setMaximized(true);
      }
    },
    [maximized, geom, defaultGeom],
  );

  const style: CSSProperties = {
    left: `${geom.left}px`,
    top: `${geom.top}px`,
    width: `${geom.width}px`,
    height: `${geom.height}px`,
    right: "auto",
    margin: 0,
  };

  return {
    style,
    interacting,
    maximized,
    dragBind,
    resizeBind,
    toggleMaximize,
  };
};
