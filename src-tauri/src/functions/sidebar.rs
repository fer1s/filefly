use std::collections::BTreeMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// Per-group sidebar customization, persisted as sidebar.toml in the app config dir. Keyed by a
// stable group id ("pinned", "network", …), not the display label, so renaming never loses the
// link. Only the `name` override is stored today; the struct leaves room for future per-group
// data (custom items, order) without breaking the file format.
#[derive(Debug, Deserialize, Serialize, Clone, Default)]
pub struct SidebarGroup {
    // User-chosen group name. Absent means "use the built-in default label".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    name: Option<String>,
    // Display position among the groups (0-based). Absent means "use the built-in default order".
    #[serde(default, skip_serializing_if = "Option::is_none")]
    order: Option<u32>,
}

// group id -> group settings. A BTreeMap keeps the file stably ordered (nicer diffs).
pub type SidebarConfig = BTreeMap<String, SidebarGroup>;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("sidebar.toml"))
}

fn read_config(app: &AppHandle) -> SidebarConfig {
    match config_path(app).and_then(|p| std::fs::read_to_string(p).map_err(|e| e.to_string())) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => SidebarConfig::new(),
    }
}

fn write_config(app: &AppHandle, config: &SidebarConfig) -> Result<(), String> {
    let serialized = toml::to_string_pretty(config).map_err(|e| e.to_string())?;
    let target = config_path(app)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(target, serialized).map_err(|e| e.to_string())
}

// All saved sidebar group settings (empty map when sidebar.toml is absent). The frontend merges
// these over its built-in defaults on launch.
#[tauri::command]
pub fn get_sidebar_groups(app: AppHandle) -> SidebarConfig {
    read_config(&app)
}

// Persist a custom name for one group, preserving any other groups' settings.
#[tauri::command]
pub fn set_sidebar_group_name(app: AppHandle, id: String, name: String) -> Result<(), String> {
    let mut config = read_config(&app);
    config.entry(id).or_default().name = Some(name);
    write_config(&app, &config)
}

// Persist the group display order from a top-to-bottom list of group ids, preserving each
// group's other settings (e.g. its custom name).
#[tauri::command]
pub fn set_sidebar_order(app: AppHandle, ids: Vec<String>) -> Result<(), String> {
    let mut config = read_config(&app);
    for (index, id) in ids.into_iter().enumerate() {
        config.entry(id).or_default().order = Some(index as u32);
    }
    write_config(&app, &config)
}
