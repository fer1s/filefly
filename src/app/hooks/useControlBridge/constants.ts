// Event the Rust control socket emits (targeted at one window) to drive navigation. Payload is the
// destination path. See functions/control.rs `navigate`.
export const CONTROL_NAVIGATE = "control://navigate";
// Event carrying a tab operation from the control socket (`sfb ui-new-tab|ui-close-tab|ui-move-tab`).
export const CONTROL_TAB = "control://tab";
