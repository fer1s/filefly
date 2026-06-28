import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from "@/shared/constants";

import { DEFAULT_ZOOM_STORAGE_KEY } from "./constants";

// Clamp a zoom multiplier to the allowed range, rounded to whole percents.
export const clampZoom = (value: number) =>
  Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

// Read the persisted default zoom, falling back to 100% when absent/out of range.
export const loadDefaultZoom = (): number => {
  const saved = Number(localStorage.getItem(DEFAULT_ZOOM_STORAGE_KEY));
  return Number.isFinite(saved) && saved >= ZOOM_MIN && saved <= ZOOM_MAX
    ? saved
    : ZOOM_DEFAULT;
};
