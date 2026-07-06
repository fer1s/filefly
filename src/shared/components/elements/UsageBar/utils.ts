import {
  USAGE_LEVEL,
  USAGE_DANGER_THRESHOLD,
  USAGE_WARNING_THRESHOLD,
  type UsageLevel,
} from "./constants";

// Severity of a disk-usage percentage: danger above 80%, warning above 50%, info at or below 50%.
export const usageLevel = (percentage: number): UsageLevel => {
  if (percentage > USAGE_DANGER_THRESHOLD) return USAGE_LEVEL.DANGER;
  if (percentage > USAGE_WARNING_THRESHOLD) return USAGE_LEVEL.WARNING;
  return USAGE_LEVEL.INFO;
};
