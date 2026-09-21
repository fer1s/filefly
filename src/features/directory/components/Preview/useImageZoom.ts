import { useCallback, useState } from "react";

import {
  IMAGE_ZOOM_MIN,
  IMAGE_ZOOM_MAX,
  NO_PAN,
  IMAGE_ROTATION_STEP,
  IMAGE_ROTATION_FULL,
} from "./constants";

const clamp = (value: number): number =>
  Math.min(IMAGE_ZOOM_MAX, Math.max(IMAGE_ZOOM_MIN, value));

// Image-preview zoom + pan state, owned by Preview so the zoom control can live in the shared
// bottom controls bar (next to prev/next) while ZoomableImage drives wheel/drag. Pan resets to
// centre whenever the zoom returns to 1x (done here, not in an effect).
export const useImageZoom = (filePath: string, visible: boolean) => {
  const [zoom, setZoom] = useState(IMAGE_ZOOM_MIN);
  const [pan, setPan] = useState(NO_PAN);
  const [rotation, setRotation] = useState(0);
  const [session, setSession] = useState({ filePath, visible });

  // File changes also come from deletion or reopening, not just the navigation buttons.
  if (session.filePath !== filePath || session.visible !== visible) {
    setSession({ filePath, visible });
    setZoom(IMAGE_ZOOM_MIN);
    setPan(NO_PAN);
    setRotation(0);
  }

  const rotate = useCallback((direction: number) => {
    setRotation(
      (current) =>
        (current + direction * IMAGE_ROTATION_STEP + IMAGE_ROTATION_FULL) %
        IMAGE_ROTATION_FULL,
    );
    setPan(NO_PAN);
  }, []);

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
    setRotation(0);
  }, []);

  return { zoom, pan, rotation, rotate, setPan, zoomTo, stepZoom, reset };
};
