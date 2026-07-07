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
    // User-added item paths for this group, in display order (shown below the built-in rows).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    items: Vec<String>,
    // Stable ids of built-in preset rows the user has hidden (see PRESET_ID on the frontend).
    // Presets can't be deleted (we couldn't re-create them), only hidden; edit mode toggles this.
    #[serde(
        rename = "hiddenPresets",
        default,
        skip_serializing_if = "Vec::is_empty"
    )]
    hidden_presets: Vec<String>,
    // True for user-created groups (vs the built-in pinned/volumes/network/tags). Only custom
    // groups can be deleted; deleting one drops the whole entry, taking its items with it.
    #[serde(default, skip_serializing_if = "is_false")]
    custom: bool,
}

fn is_false(b: &bool) -> bool {
    !*b
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

// Replace a group's user-added item paths, preserving its other settings. The frontend sends the
// full ordered list (after an add / remove / reorder), so this stays a simple set.
#[tauri::command]
pub fn set_sidebar_items(app: AppHandle, id: String, items: Vec<String>) -> Result<(), String> {
    let mut config = read_config(&app);
    config.entry(id).or_default().items = items;
    write_config(&app, &config)
}

// Replace the set of hidden built-in preset ids for a group, preserving its other settings. The
// frontend sends the full list after each hide/show toggle.
#[tauri::command]
pub fn set_hidden_presets(app: AppHandle, id: String, presets: Vec<String>) -> Result<(), String> {
    let mut config = read_config(&app);
    config.entry(id).or_default().hidden_presets = presets;
    write_config(&app, &config)
}

// Create a user group with a generated id, a display name and a display position. Marked `custom`
// so the UI knows it can be renamed and deleted (built-in groups can't be deleted).
#[tauri::command]
pub fn add_sidebar_group(
    app: AppHandle,
    id: String,
    name: String,
    order: u32,
) -> Result<(), String> {
    let mut config = read_config(&app);
    let group = config.entry(id).or_default();
    group.custom = true;
    group.name = Some(name);
    group.order = Some(order);
    write_config(&app, &config)
}

// Delete a group entirely, dropping its items/name/order with it. Intended for custom groups only
// (the frontend gates this); built-in group ids would just get recreated from defaults next launch.
#[tauri::command]
pub fn delete_sidebar_group(app: AppHandle, id: String) -> Result<(), String> {
    let mut config = read_config(&app);
    config.remove(&id);
    write_config(&app, &config)
}
