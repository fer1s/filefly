import { KEY, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from "@/shared/constants";
import { formatBinding } from "@/shared/keymap";

// Ties the dialog's heading to its accessible name (aria-labelledby).
export const SETTINGS_TITLE_ID = "settings_title";

// Close is fixed to Escape (not user-configurable), like the other dialogs.
export const CLOSE_HOTKEY = formatBinding({ keys: [KEY.ESCAPE] });

// Selectable default-zoom multipliers, from min to max in the standard step (e.g. 0.75 … 3).
export const ZOOM_OPTIONS: number[] = (() => {
  const options: number[] = [];
  for (let z = ZOOM_MIN; z <= ZOOM_MAX + ZOOM_STEP / 2; z += ZOOM_STEP)
    options.push(Math.round(z * 100) / 100);
  return options;
})();
