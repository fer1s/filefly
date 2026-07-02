use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// App-wide user settings, persisted as settings.toml in the app config dir (the source of truth;
// the frontend hydrates its state from this on launch). Field names are camelCase to match the
// frontend State and the JSON sent over IPC. `#[serde(default)]` fills any missing field from
// Default, so a hand-edited or older file with fewer keys still loads.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct AppSettings {
    // Show hidden entries (dotfiles) in folders.
    show_hidden: bool,
    // Colour theme: "system" (follow OS), "light", or "dark".
    theme: String,
    // Accent hue: "blue", "navy", "red", "teal", or "gold".
    accent_color: String,
    // Default folder zoom multiplier (1.0 = 100%) for folders without their own saved zoom.
    default_zoom: f64,
    // Date format: a token pattern (YYYY-MM-DD HH:mm, …) or the "locale" sentinel.
    date_format: String,
    // Sidebar background opacity (alpha of --color-background-sidebar), 0..1.
    sidebar_opacity: f64,
    // Context-menu background opacity (alpha of the popover surface), 0..1.
    context_menu_opacity: f64,
    // User-adjustable sidebar width (px) for the expanded rail (see SIDEBAR_WIDTH_MIN/MAX).
    sidebar_width: f64,
    // Hide this app's own background files (config/cache/temp) from the Recents listing.
    hide_system_recents: bool,
    // Show transient toast notifications (e.g. "Copied"). When off, they're suppressed.
    show_toasts: bool,
    // What to open on launch: "restore" (previous session), "volumes" (fresh at Volumes), or
    // "home" (fresh at home_path).
    startup_mode: String,
    // Folder opened on launch when startup_mode is "home" (empty = Volumes view).
    home_path: String,
    // What dragging entries onto a folder does: "move" or "copy".
    drag_drop_action: String,
    // Whether a confirmation dialog is shown before a drag-and-drop move/copy.
    confirm_drag_drop: bool,
    // Whether a confirmation dialog is shown before moving entries to the Trash (permanent delete
    // always confirms regardless).
    confirm_delete: bool,
    // Whether success toasts are clickable to jump to the affected file/folder.
    clickable_toasts: bool,
    // Whether dragging entries out of the window starts a native OS drag (drop into other apps).
    drag_to_external_apps: bool,
    // Use the app's own in-window folder picker instead of the native OS (Finder) folder dialog.
    use_custom_folder_picker: bool,
}

// Must mirror the frontend defaults (shared/constants.ts).
impl Default for AppSettings {
    fn default() -> Self {
        Self {
            show_hidden: false,
            theme: "system".to_string(),
            accent_color: "blue".to_string(),
            default_zoom: 1.0,
            date_format: "locale".to_string(),
            sidebar_opacity: 0.85,
            context_menu_opacity: 0.5,
            sidebar_width: 220.0,
            hide_system_recents: true,
            show_toasts: true,
            startup_mode: "restore".to_string(),
            home_path: String::new(),
            drag_drop_action: "move".to_string(),
            confirm_drag_drop: true,
            confirm_delete: true,
            clickable_toasts: true,
            drag_to_external_apps: true,
            use_custom_folder_picker: false,
        }
    }
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("settings.toml"))
}

// Load settings.toml, falling back to defaults when it's absent or unreadable/corrupt.
#[tauri::command]
pub fn get_settings(app: AppHandle) -> AppSettings {
    match config_path(&app).and_then(|p| std::fs::read_to_string(p).map_err(|e| e.to_string())) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => AppSettings::default(),
    }
}

// Persist the whole settings struct to settings.toml (creating the config dir if needed).
#[tauri::command]
pub fn set_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    let serialized = toml::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    let target = config_path(&app)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(target, serialized).map_err(|e| e.to_string())
}
