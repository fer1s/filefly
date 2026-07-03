// id wiring the dialog title to its aria-labelledby.
export const CONFIRMATION_TITLE_ID = "confirmation-dialog-title";

// <input> types that aren't free text (Enter on them is safe to hijack for Confirm). Any other
// input type — text, search, number, … — is treated as text entry, where Enter must reach the
// field instead. Used by the Enter-to-confirm shortcut.
export const NON_TEXT_INPUT_TYPES: readonly string[] = [
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
];
