import { useCallback, useState } from "react";

import { IMAGE_ZOOM_MIN, IMAGE_ZOOM_MAX, NO_PAN } from "./constants";

const clamp = (value: number): number =>
  Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, value));

// Image-preview zoom + pan state, owned by Preview so the zoom control can live in the shared
// bottom controls bar (next to prev/next) while ZoomableImage drives wheel/drag. Pan resets to
// centre whenever the zoom returns to 1x (done here, not in an effect).
export const useImageZoom = () => {
  const [zoom, setZoom] = useState(IMAGE_ZOOM_MIN);
  const [pan, setPan] = useState(NO_PAN);

  const zoomTo = useCallback((value: number) => {
    const next = clamp(value);
    setZoom(next);
    if (next <= IMAGE_ZOOM_MIN) setPan(NO_PAN);
  }, []);

  const stepZoom = useCallback(
    (delta: number) =>
      setZoom((current) => {
        const next = clamp(current + delta);
        if (next <= IMAGE_ZOOM_MIN) setPan(NO_PAN);
        return next;
      }),
    [],
  );

  const reset = useCallback(() => {
    setZoom(IMAGE_ZOOM_MIN);
    setPan(NO_PAN);
  }, []);

  return { zoom, pan, setPan, zoomTo, stepZoom, reset };
};
