use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// A single keybinding. `modifier` maps to/from the TOML/JSON key `mod` (a Rust keyword).
#[derive(Debug, Serialize, Deserialize)]
pub struct KeyBinding {
    keys: Vec<String>,
    #[serde(default, rename = "mod")]
    modifier: bool,
    #[serde(default)]
    shift: bool,
    #[serde(default)]
    alt: bool,
}

// Bundled defaults, used when the user has no keymap file yet (or it can't be read).
const DEFAULT_KEYMAP: &str = include_str!("../../keymap.default.toml");

fn parse(content: &str) -> Result<HashMap<String, KeyBinding>, String> {
    toml::from_str(content).map_err(|e| e.to_string())
}

// Load the keymap: the user's `keymap.toml` in the app config dir if present, otherwise the
// bundled defaults.
#[tauri::command]
pub fn get_keymap(app: AppHandle) -> Result<HashMap<String, KeyBinding>, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("keymap.toml");

    match std::fs::read_to_string(&path) {
        Ok(content) => parse(&content),
        Err(_) => parse(DEFAULT_KEYMAP),
    }
}

// TODO: `set_keymap_binding(app, action, binding)` — merge the change into the user's
// keymap.toml (creating it from DEFAULT_KEYMAP on first write) and persist it. Wire this up
// when the keymapping settings UI lands.
