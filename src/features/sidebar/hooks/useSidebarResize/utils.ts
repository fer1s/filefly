import { SIDEBAR_WIDTH_MIN, SIDEBAR_WIDTH_MAX } from "@/shared/constants";

// Clamp a proposed sidebar width to the allowed range.
export const clampWidth = (width: number) =>
  Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, width));
