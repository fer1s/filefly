use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// Ordered list of action ids shown for an entry kind (the literal "separator" draws a divider).
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ActionList {
    #[serde(default)]
    actions: Vec<String>,
}

// A file-type rule: files whose extension matches use these actions instead of [file].
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct FileType {
    #[serde(default)]
    extensions: Vec<String>,
    #[serde(default)]
    actions: Vec<String>,
}

// The full context-menu layout. Field names match the TOML table names and are sent to the
// frontend as-is (snake_case).
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ContextMenu {
    #[serde(default)]
    directory: ActionList,
    #[serde(default)]
    folder: ActionList,
    #[serde(default)]
    file: ActionList,
    // Entries shown while browsing the Trash (Restore / permanent delete instead of Move-to-Trash).
    #[serde(default)]
    trash: ActionList,
    #[serde(default)]
    file_type: HashMap<String, FileType>,
}

// Bundled defaults, used when the user has no context_menu.toml yet (or it can't be read).
const DEFAULT_CONTEXT_MENU: &str = include_str!("../../context_menu.default.toml");

fn parse(content: &str) -> Result<ContextMenu, String> {
    toml::from_str(content).map_err(|e| e.to_string())
}

// Load the context-menu layout: the user's `context_menu.toml` in the app config dir if
// present, otherwise the bundled defaults.
#[tauri::command]
pub fn get_context_menu(app: AppHandle) -> Result<ContextMenu, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("context_menu.toml");

    match std::fs::read_to_string(&path) {
        Ok(content) => parse(&content),
        Err(_) => parse(DEFAULT_CONTEXT_MENU),
    }
}
