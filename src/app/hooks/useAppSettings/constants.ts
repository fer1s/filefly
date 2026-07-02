// The default settings live in shared (composed from shared constants, mirrors the Rust defaults)
// so features can reference them without depending on the app layer. Re-exported here for the
// hook's existing consumers.
export { DEFAULT_SETTINGS } from "@/shared/constants";

// Coalesce rapid changes (e.g. dragging the opacity slider) into one disk write.
export const SETTINGS_PERSIST_DEBOUNCE_MS = 300;
