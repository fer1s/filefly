// Elements considered keyboard-focusable inside a dialog: the tab-trap cycles through these, and
// the initial focus lands on the first one. Excludes tabindex="-1" (programmatic-only focus, e.g.
// the dialog container itself).
export const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
