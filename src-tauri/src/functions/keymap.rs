use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

// Raw binding as written in keymap.toml. May carry per-OS overrides (`macos`/`windows`/`linux`)
// that fully replace the base binding on that platform. `modifier` maps to/from the key `mod`.
#[derive(Debug, Deserialize)]
struct RawBinding {
    #[serde(default)]
    keys: Vec<String>,
    #[serde(default, rename = "mod")]
    modifier: bool,
    // Literal Control key on every platform (distinct from `mod` = Cmd/Ctrl), e.g. Ctrl+`.
    #[serde(default)]
    ctrl: bool,
    #[serde(default)]
    shift: bool,
    #[serde(default)]
    alt: bool,
    #[serde(default)]
    macos: Option<Box<RawBinding>>,
    #[serde(default)]
    windows: Option<Box<RawBinding>>,
    #[serde(default)]
    linux: Option<Box<RawBinding>>,
}

// Resolved binding sent to the frontend (always flat, for the current platform).
#[derive(Debug, Serialize)]
pub struct KeyBinding {
    keys: Vec<String>,
    #[serde(rename = "mod")]
    modifier: bool,
    ctrl: bool,
    shift: bool,
    alt: bool,
}

// Pick the override for the current OS (if it defines keys), otherwise the base binding.
fn resolve(raw: RawBinding) -> KeyBinding {
    let os_override = if cfg!(target_os = "macos") {
        raw.macos
    } else if cfg!(target_os = "windows") {
        raw.windows
    } else {
        raw.linux
    };

    if let Some(over) = os_override {
        if !over.keys.is_empty() {
            return KeyBinding {
                keys: over.keys,
                modifier: over.modifier,
                ctrl: over.ctrl,
                shift: over.shift,
                alt: over.alt,
            };
        }
    }

    KeyBinding {
        keys: raw.keys,
        modifier: raw.modifier,
        ctrl: raw.ctrl,
        shift: raw.shift,
        alt: raw.alt,
    }
}

fn parse(content: &str) -> Result<HashMap<String, KeyBinding>, String> {
    let raw: HashMap<String, RawBinding> =
        toml::from_str(content).map_err(|e| e.to_string())?;
    Ok(raw.into_iter().map(|(k, v)| (k, resolve(v))).collect())
}

// Bundled defaults, used when the user has no keymap file yet (or it can't be read).
const DEFAULT_KEYMAP: &str = include_str!("../../keymap.default.toml");

// Load the keymap: the user's `keymap.toml` in the app config dir if present, otherwise the
// bundled defaults. Per-OS overrides are resolved to the running platform.
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
