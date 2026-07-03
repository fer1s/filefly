import { ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "@/shared/constants";

// Ties the dialog's heading to its accessible name (aria-labelledby).
export const SETTINGS_TITLE_ID = "settings_title";

// Glyph on the reset-to-default button (a counter-clockwise arrow). Kept as a constant so it isn't
// a bare literal in JSX; the button's accessible name comes from its aria-label.
export const RESET_GLYPH = "↺";

// Delay before a slider's value is committed to settings after the last move (RangeControl). Keeps
// a drag from spamming updates while the thumb stays instant; the commit is flushed on release.
export const RANGE_COMMIT_DEBOUNCE_MS = 120;

// Dropdown sentinel for the "Custom…" date-format option (reveals the pattern input). Distinct
// from any real format value.
export const DATE_FORMAT_CUSTOM = "custom";

// Starter pattern seeded into the custom input when switching to "Custom…" from a preset.
export const DATE_FORMAT_CUSTOM_SEED = "YYYY-MM-DD HH:mm";

// Built-in date-format patterns offered in the dropdown (each shown as a live sample).
export const DATE_FORMAT_PRESETS: readonly string[] = [
  "YYYY-MM-DD HH:mm",
  "DD/MM/YYYY HH:mm",
  "MM/DD/YYYY hh:mm A",
  "YYYY-MM-DD",
  "D MMM YYYY, HH:mm",
];

// Selectable default-zoom multipliers, from min to max in the standard step (e.g. 0.75 … 3).
export const ZOOM_OPTIONS: number[] = (() => {
  const options: number[] = [];
  for (let z = ZOOM_MIN; z <= ZOOM_MAX + ZOOM_STEP / 2; z += ZOOM_STEP)
    options.push(Math.round(z * 100) / 100);
  return options;
})();
