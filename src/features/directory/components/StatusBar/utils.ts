import { PERCENT_MAX } from "./constants";

// A missing total must not render NaN or Infinity while system metrics initialise.
export const usagePercent = (used: number, total: number): number =>
  total > 0
    ? Math.round(
        Math.min(PERCENT_MAX, Math.max(0, (used / total) * PERCENT_MAX)),
      )
    : 0;
