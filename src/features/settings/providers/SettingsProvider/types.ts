import type { ReactNode } from "react";

import type { AppSettings } from "@/shared/services/api";

import type { SettingsUpdate } from "../../schema";
import type { SettingsManager } from "../../managers/SettingsManager";

export type SettingsProviderProps = {
  children: ReactNode;
  // Live settings + patch writer, owned by useAppSettings at the app root and threaded in so the
  // schema-driven dialog can read/write them (and compare against the defaults).
  settings: AppSettings;
  update: SettingsUpdate;
};

export type SettingsContextValue = {
  // Open / close the settings dialog. Visibility itself is owned by the provider.
  open: () => void;
  close: () => void;
  // Live settings, the patch writer, and the defaults — consumed by the schema-driven dialog to
  // read/write values generically and to power the modified indicator + reset-to-default.
  settings: AppSettings;
  update: SettingsUpdate;
  defaults: AppSettings;
  // Domain operations for the settings dialog (storage, default-folder-handler, import/export),
  // so the controls go through the manager instead of calling the Tauri service directly.
  manager: SettingsManager;
};
