// Severity levels for the disk-usage bar, driving its fill colour.
export const USAGE_LEVEL = {
  INFO: "info",
  WARNING: "warning",
  DANGER: "danger",
} as const;

export type UsageLevel = (typeof USAGE_LEVEL)[keyof typeof USAGE_LEVEL];

// Percentage thresholds that switch the bar colour: above 80% is danger, above 50% is warning,
// anything at or below 50% is info.
export const USAGE_WARNING_THRESHOLD = 50;
export const USAGE_DANGER_THRESHOLD = 80;
