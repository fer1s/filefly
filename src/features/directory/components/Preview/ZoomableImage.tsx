import { useEffect, useRef, type PointerEvent } from "react";

import { t } from "@/lang";

import { IMAGE_ZOOM_MIN, IMAGE_ZOOM_STEP } from "./constants";
import type { ZoomableImageProps } from "./types";
import { useImageGeometry } from "./useImageGeometry";
import { useImageLoad } from "./useImageLoad";
import ImagePreviewSkeleton from "./ImagePreviewSkeleton";

// Image with scroll-to-zoom and drag-to-pan (only while zoomed in). At 1x without rotation it
// remains untransformed for macOS Live Text selection. Transforms are controlled by Preview
// (so the zoom control can live in the shared bottom bar); this component just applies the
// transform and reports wheel/drag back up.
export const ZoomableImage = ({
  path,
  alt,
  onContextMenu,
  zoom,
  rotation,
  pan,
  onZoomTo,
  onPanChange,
}: ZoomableImageProps) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const { loading, failed, ready, fallback } = useImageLoad(imgRef, path);
  const { scale, clampPan } = useImageGeometry(imgRef, rotation, zoom);
  const visiblePan = clampPan(pan);
  // Mirror the zoom prop so the (long-lived) wheel listener reads the latest value.
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Drag origin while panning; null when not dragging.
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // Keep stored pan aligned with the visible bounds after zoom, rotation or a panel resize.
  useEffect(() => {
    if (visiblePan.x !== pan.x || visiblePan.y !== pan.y)
      onPanChange({ x: visiblePan.x, y: visiblePan.y });
  }, [visiblePan.x, visiblePan.y, pan.x, pan.y, onPanChange]);

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
    dragRef.current = {
      x: e.clientX - visiblePan.x,
      y: e.clientY - visiblePan.y,
    };
  };

  const onPointerMove = (e: PointerEvent<HTMLImageElement>) => {
    if (!dragRef.current) return;
    onPanChange(
      clampPan({
        x: e.clientX - dragRef.current.x,
        y: e.clientY - dragRef.current.y,
      }),
    );
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const zoomed = zoom > IMAGE_ZOOM_MIN;

  return (
    <>
      {loading && <ImagePreviewSkeleton />}
      {failed && (
        <p className="preview_image_error" role="alert">
          {t.imagePreview.loadError}
        </p>
      )}
      <img
        ref={imgRef}
        alt={alt}
        title={fallback ? t.imagePreview.compatiblePreview : undefined}
        draggable={false}
        decoding="async"
        aria-hidden={!ready}
        onContextMenu={onContextMenu}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onLostPointerCapture={onPointerUp}
        style={{
          // Keep the layout box measurable for zoom/rotation while hiding incomplete pixels.
          visibility: ready ? "visible" : "hidden",
          position: failed ? "absolute" : undefined,
          transform:
            zoomed || rotation !== 0
              ? `translate(${visiblePan.x}px, ${visiblePan.y}px) rotate(${rotation}deg) scale(${scale})`
              : undefined,
          cursor: zoomed ? "grab" : undefined,
          userSelect: zoomed ? "none" : undefined,
        }}
      />
    </>
  );
};
