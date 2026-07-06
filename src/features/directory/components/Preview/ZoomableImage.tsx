import { useEffect, useRef, type PointerEvent } from "react";

import { IMAGE_ZOOM_MIN, IMAGE_ZOOM_STEP } from "./constants";
import type { ZoomableImageProps } from "./types";

// Image with scroll-to-zoom and drag-to-pan (only while zoomed in). At 1x it behaves like a
// plain image, so macOS Live Text selection still works. Zoom + pan are controlled by Preview
// (so the zoom control can live in the shared bottom bar); this component just applies the
// transform and reports wheel/drag back up.
export const ZoomableImage = ({
  src,
  alt,
  onContextMenu,
  zoom,
  pan,
  onZoomTo,
  onPanChange,
}: ZoomableImageProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  // Mirror the zoom prop so the (long-lived) wheel listener reads the latest value.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Drag origin while panning; null when not dragging.
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Max pan (screen px) that keeps the scaled image covering the viewport. Transform origin is
  // centre, so each axis allows half the overflow. offsetWidth/Height are the 1x layout box
  // (unaffected by the CSS transform); the parent is the visible container.
  const clampPan = (next: { x: number; y: number }, scale: number) => {
    const el = imgRef.current;
    if (!el) return next;
    const parent = el.parentElement;
    const maxX = Math.max(
      0,
      (el.offsetWidth * scale - (parent?.clientWidth ?? 0)) / 2,
    );
    const maxY = Math.max(
      0,
      (el.offsetHeight * scale - (parent?.clientHeight ?? 0)) / 2,
    );
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  };

  // Re-clamp pan whenever zoom changes (e.g. zooming out shrinks the valid pan range, so a pan
  // set at higher zoom would otherwise push the image off-screen).
  useEffect(() => {
    const clamped = clampPan(pan, zoom);
    if (clamped.x !== pan.x || clamped.y !== pan.y) onPanChange(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  // Wheel zoom needs a non-passive listener to preventDefault (React's onWheel is passive).
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      onZoomTo(zoomRef.current - e.deltaY * IMAGE_ZOOM_STEP);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onZoomTo]);

  const onPointerDown = (e: PointerEvent<HTMLImageElement>) => {
    if (zoom <= IMAGE_ZOOM_MIN) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const onPointerMove = (e: PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current) return;
    onPanChange(
      clampPan(
        { x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y },
        zoom,
      ),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const zoomed = zoom > IMAGE_ZOOM_MIN;

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      draggable={false}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        transform: zoomed
          ? `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
          : undefined,
        cursor: zoomed ? "grab" : undefined,
        userSelect: zoomed ? "none" : undefined,
      }}
    />
  );
};
