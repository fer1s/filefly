use std::path::PathBuf;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::filesystem::fs::dir_size_core;

// One of the app's on-disk data locations with its recursively-summed size in bytes. `kind` is a
// stable id ("config" | "cache") the frontend maps to a localized label; `path` is the absolute
// directory. Only directories that actually exist are reported.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageLocation {
    kind: String,
    path: String,
    size: u64,
}

// The app's data footprint: where it keeps files on disk (config dir with settings.toml/sidebar/
// trash ledger; cache dir with thumbnails) and how much space each takes. Backs the Storage
// section in Settings. Async + spawn_blocking because summing the cache walks every file
// (see dir_size_core), which must stay off the UI thread.
#[tauri::command]
pub async fn get_app_storage(app: AppHandle) -> Result<Vec<StorageLocation>, String> {
    let dirs = [
        ("config", app.path().app_config_dir()),
        ("cache", app.path().app_cache_dir()),
    ];
    // Resolve each dir, keep only the ones present on disk (a fresh install may lack the cache).
    let existing: Vec<(String, PathBuf)> = dirs
        .into_iter()
        .filter_map(|(kind, dir)| dir.ok().map(|path| (kind.to_string(), path)))
        .filter(|(_, path)| path.exists())
        .collect();

    tauri::async_runtime::spawn_blocking(move || {
        existing
            .into_iter()
            .map(|(kind, path)| StorageLocation {
                size: dir_size_core(&path.to_string_lossy()),
                path: path.to_string_lossy().into_owned(),
                kind,
            })
            .collect()
    })
    .await
    .map_err(|error| error.to_string())
}

// Reclaim the app's cache directory (thumbnails and other regenerable files). Only the cache is
// cleared — never the config dir, which holds settings.toml, the sidebar, and the trash ledger.
// The whole cache dir is removed; it's recreated lazily the next time something is cached. A
// missing cache dir (fresh install / already cleared) is a no-op success. Backs the "clear" button
// in the Storage settings panel. spawn_blocking because the recursive delete must stay off the UI
// thread.
#[tauri::command]
pub async fn clear_app_cache(app: AppHandle) -> Result<(), String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        if cache.exists() {
            std::fs::remove_dir_all(&cache).map_err(|e| e.to_string())?;
        }
        Ok(())
    })
    .await
    .map_err(|error| error.to_string())?
}
