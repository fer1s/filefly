import { ZOOM_MAX, ZOOM_MIN } from "@/shared/constants";

// Clamp a zoom multiplier to the allowed range, rounded to whole percents.
export const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
