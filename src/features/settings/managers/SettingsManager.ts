import * as api from "@/shared/services/api";
import type {
  AppSettings,
  AppStorageLocation,
  ExportResult,
} from "@/shared/services/api";

// Encapsulates the settings dialog's domain operations: inspecting the app's on-disk storage,
// toggling the macOS default-folder-handler (Launch Services state), and importing/exporting the
// settings.toml. Controls consume this through SettingsProvider instead of calling the Tauri
// service (`api`) directly, keeping IPC + orchestration out of the leaf controls.
export class SettingsManager {
  // The app's on-disk data locations with their recursively-summed sizes (Storage panel).
  getStorage(): Promise<AppStorageLocation[]> {
    return api.getAppStorage();
  }

  // Open a folder in a new browser window (the Storage panel's path buttons).
  openPath(path: string): Promise<void> {
    return api.openPathInNewWindow(path);
  }

  // Reclaim the app's cache (thumbnails etc.); leaves config/data untouched. Storage panel button.
  clearCache(): Promise<void> {
    return api.clearAppCache();
  }

  // Whether this app is macOS's default folder handler (Launch Services).
  isDefaultFolderHandler(): Promise<boolean> {
    return api.isDefaultFolderHandler();
  }

  // Make this app the default folder handler (enable) or restore Finder (disable).
  setDefaultFolderHandler(enable: boolean): Promise<void> {
    return api.setDefaultFolderHandler(enable);
  }

  // Read + parse a settings.toml the user chose (missing keys fall back to defaults). Does not
  // persist — the caller applies the result through the normal patch writer.
  importSettings(path: string): Promise<AppSettings> {
    return api.importSettings(path);
  }

  // Write the given settings as a settings.toml into `dir` (see api.exportSettings for the
  // unique/overwrite semantics).
  exportSettings(
    dir: string,
    settings: AppSettings,
    unique: boolean,
    overwrite: boolean,
  ): Promise<ExportResult> {
    return api.exportSettings(dir, settings, unique, overwrite);
  }
}
