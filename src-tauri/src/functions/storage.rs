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
