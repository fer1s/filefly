import {
  ZOOM_DEFAULT,
  DEFAULT_DATE_FORMAT,
  DEFAULT_SIDEBAR_OPACITY,
} from "@/shared/constants";
import type { AppSettings } from "@/shared/services/api";

// Seed used before settings.toml is hydrated. Must match the Rust defaults (functions/settings.rs).
export const DEFAULT_SETTINGS: AppSettings = {
  showHidden: false,
  defaultZoom: ZOOM_DEFAULT,
  dateFormat: DEFAULT_DATE_FORMAT,
  sidebarOpacity: DEFAULT_SIDEBAR_OPACITY,
  hideSystemRecents: true,
};

// Coalesce rapid changes (e.g. dragging the opacity slider) into one disk write.
export const SETTINGS_PERSIST_DEBOUNCE_MS = 300;
