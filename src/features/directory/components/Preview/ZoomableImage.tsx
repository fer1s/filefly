import { useEffect, useRef, useState, type PointerEvent } from "react";

import ZoomControl from "@/shared/components/patterns/ZoomControl";

import {
  IMAGE_ZOOM_MIN,
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_STEP,
  IMAGE_ZOOM_BUTTON_STEP,
} from "./constants";
import type { ZoomableImageProps } from "./types";

// Image with scroll-to-zoom and drag-to-pan (only while zoomed in). At 1x it behaves like a
// plain image, so macOS Live Text selection still works. Mount with a key per file so zoom/pan
// reset on navigation.
export const ZoomableImage = ({
  src,
  alt,
  onContextMenu,
}: ZoomableImageProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const zoomRef = useRef(IMAGE_ZOOM_MIN);
  const [zoom, setZoom] = useState(IMAGE_ZOOM_MIN);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Wheel zoom needs a non-passive listener to preventDefault (React's onWheel is passive).
  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const next = Math.min(
        IMAGE_ZOOM_MAX,
        Math.max(IMAGE_ZOOM_MIN, zoomRef.current - e.deltaY * IMAGE_ZOOM_STEP),
      );
      zoomRef.current = next;
      setZoom(next);
      if (next === IMAGE_ZOOM_MIN) setPan({ x: 0, y: 0 });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLImageElement>) => {
    if (zoom <= IMAGE_ZOOM_MIN) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const onPointerMove = (e: PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current) return;
    setPan({
      x: e.clientX - dragRef.current.x,
      y: e.clientY - dragRef.current.y,
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // Set the zoom to an absolute multiplier (clamped). Resets pan when back at 1x.
  const zoomTo = (value: number) => {
    const next = Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, value));
    zoomRef.current = next;
    setZoom(next);
    if (next === IMAGE_ZOOM_MIN) setPan({ x: 0, y: 0 });
  };

  const stepZoom = (delta: number) => zoomTo(zoomRef.current + delta);

  const zoomed = zoom > IMAGE_ZOOM_MIN;

  return (
    <>
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
      <ZoomControl
        className="image_zoom_control"
        value={zoom}
        min={IMAGE_ZOOM_MIN}
        max={IMAGE_ZOOM_MAX}
        onZoomIn={() => stepZoom(IMAGE_ZOOM_BUTTON_STEP)}
        onZoomOut={() => stepZoom(-IMAGE_ZOOM_BUTTON_STEP)}
        onZoomTo={zoomTo}
      />
    </>
  );
};
