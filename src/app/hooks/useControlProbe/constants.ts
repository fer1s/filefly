// Event the Rust control socket emits for a `sfb ui-probe` request; payload carries the request id
// and optional args. The reply goes back via set_probe_result. See functions/control.rs `probe`.
export const CONTROL_PROBE = "control://probe";

// data-kind marker on entry tiles (see DirEntry): lets this DOM-only probe tell folders from files.
export const DIR_KIND = "dir";
