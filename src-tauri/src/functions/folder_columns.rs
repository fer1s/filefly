use std::collections::BTreeMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// All list columns, in display order. Mirrors SORT_KEY on the frontend.
const ALL_COLUMNS: [&str; 5] = ["name", "modified", "created", "size", "kind"];

// Per-folder view settings persisted centrally: which list columns are visible and whether the
// folder is shown as a grid or a list. Empty/absent fields are omitted from the file.
#[derive(Debug, Deserialize, Serialize, Clone, Default)]
struct FolderSettings {
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    columns: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    view: Option<String>,
}

// path -> settings. A BTreeMap keeps the file stably ordered (nicer diffs / AI-friendly).
type SettingsConfig = BTreeMap<String, FolderSettings>;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("folder-columns.toml"))
}

fn read_config(app: &AppHandle) -> SettingsConfig {
    match config_path(app).and_then(|p| std::fs::read_to_string(p).map_err(|e| e.to_string())) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => SettingsConfig::new(),
    }
}

fn write_config(app: &AppHandle, config: &SettingsConfig) -> Result<(), String> {
    let serialized = toml::to_string_pretty(config).map_err(|e| e.to_string())?;
    let target = config_path(app)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(target, serialized).map_err(|e| e.to_string())
}

fn strings(cols: &[&str]) -> Vec<String> {
    cols.iter().map(|s| s.to_string()).collect()
}

// Columns for a folder with no saved preference, seeded from well-known folders (using only the
// columns that currently exist). Unknown folders fall back to all columns.
fn default_columns(app: &AppHandle, path: &str) -> Vec<String> {
    let resolver = app.path();
    let is = |dir: Result<PathBuf, tauri::Error>| {
        dir.map(|d| d.to_string_lossy() == path).unwrap_or(false)
    };

    if is(resolver.download_dir()) {
        strings(&["name", "modified", "size", "kind"])
    } else if is(resolver.picture_dir()) {
        strings(&["name", "created", "size"])
    } else if is(resolver.audio_dir()) {
        strings(&["name", "modified", "size", "kind"])
    } else if is(resolver.document_dir()) {
        strings(&["name", "modified", "size"])
    } else {
        strings(&ALL_COLUMNS)
    }
}

// Visible columns for a folder: the user's saved preference if any, otherwise the default.
#[tauri::command]
pub fn get_folder_columns(app: AppHandle, path: String) -> Vec<String> {
    match read_config(&app).get(&path) {
        Some(s) if !s.columns.is_empty() => s.columns.clone(),
        _ => default_columns(&app, &path),
    }
}

// Persist the visible columns for a folder, preserving its saved view.
#[tauri::command]
pub fn set_folder_columns(
    app: AppHandle,
    path: String,
    columns: Vec<String>,
) -> Result<(), String> {
    let mut config = read_config(&app);
    config.entry(path).or_default().columns = columns;
    write_config(&app, &config)
}

// Saved grid/list view for a folder (None when the user hasn't set one).
#[tauri::command]
pub fn get_folder_view(app: AppHandle, path: String) -> Option<String> {
    read_config(&app).get(&path).and_then(|s| s.view.clone())
}

// Persist the grid/list view for a folder, preserving its saved columns.
#[tauri::command]
pub fn set_folder_view(app: AppHandle, path: String, view: String) -> Result<(), String> {
    let mut config = read_config(&app);
    config.entry(path).or_default().view = Some(view);
    write_config(&app, &config)
}
