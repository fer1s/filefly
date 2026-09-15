import * as api from "@/shared/services/api";
import type {
  AppSettings,
  AppStorageLocation,
  CleanupResult,
  CleanupTarget,
  ExportResult,
} from "@/shared/services/api";
import type { ContextMenuLayout, CustomContextAction } from "@/shared/models";
import type { CleanupMode } from "@/shared/constants";
import {
  contextActionsBundlePath,
  parseContextActionsBundle,
  toContextActionsBundle,
} from "@/shared/contextActions";

// Encapsulates the settings dialog's domain operations: inspecting the app's on-disk storage,
// toggling the macOS default-folder-handler (Launch Services state), and importing/exporting the
// settings.toml. Controls consume this through SettingsProvider instead of calling the Tauri
// service (`api`) directly, keeping IPC + orchestration out of the leaf controls.
export class SettingsManager {
  getContextMenu(): Promise<ContextMenuLayout> {
    return api.getContextMenu();
  }

  setContextMenu(menu: ContextMenuLayout): Promise<ContextMenuLayout> {
    return api.setContextMenu(menu);
  }

  // Write the custom context actions into `dir` as a shareable context-actions.json. An existing
  // bundle there is reported back (`existed`) and left untouched unless `overwrite` — the caller
  // confirms first, mirroring the settings export.
  async exportContextActions(
    dir: string,
    actions: CustomContextAction[],
    overwrite: boolean,
  ): Promise<{ path: string; existed: boolean }> {
    const path = contextActionsBundlePath(dir);
    const existed = await api
      .getEntry(path)
      .then(() => true)
      .catch(() => false);
    if (existed && !overwrite) return { path, existed };
    await api.writeTextFile(
      path,
      `${JSON.stringify(toContextActionsBundle(actions), null, 2)}\n`,
    );
    return { path, existed };
  }

  // Read + validate a bundle the user picked. Does not persist — the caller merges the result
  // into the current actions and saves them through the normal context-menu writer.
  async importContextActions(
    path: string,
    reasons: { invalid: string; empty: string },
  ): Promise<CustomContextAction[]> {
    return parseContextActionsBundle(await api.readTextFile(path), reasons);
  }

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

  // The folders the user registered for periodic cleanup, with their live sizes (Cleanup panel).
  getCleanupTargets(): Promise<CleanupTarget[]> {
    return api.getCleanupTargets();
  }

  // Register a folder to watch. Rejects unsafe paths and duplicates with a CLEANUP_ERROR code.
  addCleanupTarget(path: string, mode: CleanupMode): Promise<void> {
    return api.addCleanupTarget(path, mode);
  }

  // Forget a registered folder without touching anything on disk.
  removeCleanupTarget(path: string): Promise<void> {
    return api.removeCleanupTarget(path);
  }

  // Switch a target between emptying its contents and trashing the folder itself.
  setCleanupTargetMode(path: string, mode: CleanupMode): Promise<void> {
    return api.setCleanupTargetMode(path, mode);
  }

  // Move one target (or its children) to the system Trash and report what was reclaimed.
  cleanCleanupTarget(path: string): Promise<CleanupResult> {
    return api.cleanCleanupTarget(path);
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
