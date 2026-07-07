use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};

use crate::ignore::IgnoreList;
use crate::index::{self, SizeIndex};

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
    // Preview floating-controls pill background opacity (alpha of the popover surface), 0..1.
    preview_controls_opacity: f64,
    // Dialog (modal) background opacity (alpha of the modal surface), 0..1.
    dialog_opacity: f64,
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
    // Open images in the app's built-in preview (on Enter/double-click) instead of the OS default
    // app (macOS Preview).
    preview_images_in_app: bool,
    // Open markdown files in the app's built-in preview (on Enter/double-click) instead of the OS
    // default app.
    preview_markdown_in_app: bool,
    // Open the built-in preview in its own detached window instead of the in-app overlay. A new
    // window is spawned per open (see window::create_preview_window).
    open_preview_in_window: bool,
    // Open the properties in their own detached window instead of the in-app dialog. A new window
    // is spawned per open (see window::create_properties_window).
    open_properties_in_window: bool,
    // On export, ask before replacing an existing settings.toml. When off (default), a unique
    // filename is used instead so nothing is overwritten silently.
    confirm_export_overwrite: bool,
    // Generate thumbnails for images on remote (SFTP) hosts. Off by default: each thumbnail must
    // download the whole file over the network, so browsing an image-heavy remote folder would be
    // slow/costly. When on, remote images thumbnail like local ones (via the cache).
    remote_thumbnails: bool,
    // Show a live CPU / RAM / disk readout in the status bar. Off by default — it polls the OS on
    // an interval, so it's opt-in.
    show_system_stats: bool,
    // Compute and show recursive folder sizes in the list-view "Size" column. Off by default —
    // walking every folder is costly on large directories (sizes are cached in size_index.db).
    show_folder_sizes: bool,
    // Show "used / total" text under each volume's usage bar in the sidebar. Off by default.
    show_volume_size: bool,
    // Glob patterns (matched against an entry's file name) excluded from recursive folder-size
    // calculation, e.g. ".DS_Store", "*.tmp", "node_modules". Empty by default. Applied live: on
    // save these replace the size-index name-globs and the size cache is cleared so it recomputes.
    size_ignores: Vec<String>,
}

impl AppSettings {
    // The size-ignore globs, trimmed and de-blanked so an empty editor row never becomes a
    // match-everything (glob_match treats "" as a no-op anyway, but this keeps the stored list clean).
    pub fn size_ignores(&self) -> Vec<String> {
        self.size_ignores
            .iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    }
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
            preview_controls_opacity: 0.5,
            dialog_opacity: 0.85,
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
            preview_images_in_app: false,
            preview_markdown_in_app: false,
            open_preview_in_window: false,
            open_properties_in_window: false,
            confirm_export_overwrite: false,
            remote_thumbnails: false,
            show_system_stats: false,
            show_folder_sizes: false,
            show_volume_size: false,
            size_ignores: default_size_ignores(),
        }
    }
}

// Default folder-size exclusions. On macOS, OS-generated junk (Finder metadata, AppleDouble forks,
// Spotlight/Trash/Versions/FSEvents stores, WidgetKit timeline caches, localization markers,
// Windows-share droppings) that never holds user content and only inflates size totals — so new users get sensible exclusions. Mirrors MACOS_SIZE_IGNORES in shared/constants.ts
// (must stay in sync). Empty on other platforms.
#[cfg(target_os = "macos")]
fn default_size_ignores() -> Vec<String> {
    [
        ".DS_Store",
        "._*",
        ".Spotlight-V100",
        ".Trashes",
        ".DocumentRevisions-V100",
        ".apdisk",
        ".fseventsd",
        "com.apple.chrono",
        ".localized",
        ".AppleDouble",
        "Thumbs.db",
        "desktop.ini",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect()
}

#[cfg(not(target_os = "macos"))]
fn default_size_ignores() -> Vec<String> {
    Vec::new()
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

// Persist the whole settings struct to settings.toml (creating the config dir if needed), then
// push the size-ignore globs into the live IgnoreList. When they changed, the size cache is cleared
// so recursive sizes recompute under the new rules (they're keyed on mtime, which the rule change
// doesn't touch, so stale rows would otherwise linger).
#[tauri::command]
pub fn set_settings(
    app: AppHandle,
    settings: AppSettings,
    ignore: State<'_, IgnoreList>,
    size_index: State<'_, SizeIndex>,
) -> Result<(), String> {
    let serialized = toml::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    let target = config_path(&app)?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(target, serialized).map_err(|e| e.to_string())?;

    let new_globs = settings.size_ignores();
    if new_globs != ignore.snapshot().name_globs {
        ignore.set_globs(new_globs);
        index::clear(&size_index.0);
    }
    Ok(())
}

// Read and parse a settings.toml the user chose (via the file picker), filling any missing keys
// from Default so an older/partial file still loads. Does NOT persist: the frontend applies the
// returned settings through its normal update flow, which writes settings.toml. Errors if the
// file can't be read or isn't valid TOML.
#[tauri::command]
pub fn import_settings(path: String) -> Result<AppSettings, String> {
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    toml::from_str(&content).map_err(|e| e.to_string())
}

// Outcome of an export attempt. `path` is the file written (None when we stopped to ask about an
// overwrite); `existed` is true when a settings.toml was already there and we didn't touch it.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    path: Option<String>,
    existed: bool,
}

// First non-colliding `settings.toml` / `settings-N.toml` in `dir`, so auto-export never
// overwrites an existing file.
fn unique_export_path(dir: &str) -> PathBuf {
    let base = PathBuf::from(dir);
    let mut candidate = base.join("settings.toml");
    let mut n = 1;
    while candidate.exists() {
        candidate = base.join(format!("settings-{n}.toml"));
        n += 1;
    }
    candidate
}

// Write the given settings as a settings.toml into `dir`. Behaviour:
//   unique = true      → write to the first free settings[-N].toml (never overwrites).
//   unique = false     → target is settings.toml; if it exists and overwrite = false, write
//                        nothing and report `existed` so the caller can confirm, then call again
//                        with overwrite = true.
// Returns the path written (or None when it stopped to ask). Used by the settings dialog's Export.
#[tauri::command]
pub fn export_settings(
    dir: String,
    settings: AppSettings,
    unique: bool,
    overwrite: bool,
) -> Result<ExportResult, String> {
    let serialized = toml::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    let target = if unique {
        unique_export_path(&dir)
    } else {
        let base = PathBuf::from(&dir).join("settings.toml");
        if base.exists() && !overwrite {
            return Ok(ExportResult {
                path: None,
                existed: true,
            });
        }
        base
    };
    std::fs::write(&target, serialized).map_err(|e| e.to_string())?;
    Ok(ExportResult {
        path: Some(target.to_string_lossy().to_string()),
        existed: false,
    })
}
