import {
  ZOOM_DEFAULT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_SIDEBAR_OPACITY,
  DEFAULT_SIDEBAR_WIDTH,
  DEFAULT_STARTUP_MODE,
} from "@/shared/constants";
import type { AppSettings } from "@/shared/services/api";

// Seed used before settings.toml is hydrated. Must match the Rust defaults (functions/settings.rs).
export const DEFAULT_SETTINGS: AppSettings = {
  showHidden: false,
  defaultZoom: ZOOM_DEFAULT,
  dateFormat: DEFAULT_DATE_FORMAT,
  sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
  sidebarWidth: DEFAULT_SIDEBAR_WIDTH,
  hideSystemRecents: true,
  showToasts: true,
  startupMode: DEFAULT_STARTUP_MODE,
  homePath: "",
};

// Coalesce rapid changes (e.g. dragging the opacity slider) into one disk write.
export const SETTINGS_PERSIST_DEBOUNCE_MS = 300;
