export { SettingsProvider, useSettings } from "./providers/SettingsProvider";
// Controls and the custom-control contract reused by other features (e.g. the onboarding wizard's
// appearance / integration steps) — the only sanctioned way in; never import settings internals.
export { default as AccentControl } from "./components/SettingsDialog/controls/AccentControl";
export { default as FolderHandlerControl } from "./components/SettingsDialog/controls/FolderHandlerControl";
export type { CustomControlProps } from "./schema";
