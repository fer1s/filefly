//! Custom context actions: the `context_menu.toml` contract plus the pure cores that read it and
//! execute one action. Shared by the Tauri commands (`functions::context_menu`) and the `sfb`
//! CLI, matching the `*_core` split used by the rest of `filesystem/`: nothing here touches
//! `AppHandle` — callers pass the app config dir and the user's home instead.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::process::Command;

use serde::{Deserialize, Serialize};

pub const CONTEXT_MENU_FILE: &str = "context_menu.toml";

const TARGET_DIRECTORY: &str = "directory";
const TARGET_FOLDER: &str = "folder";
const TARGET_FILE: &str = "file";
const DEFAULT_CUSTOM_ICON: &str = "bolt";
const PATH_TOKEN: &str = "{path}";
const PATHS_TOKEN: &str = "{paths}";
const DIRECTORY_TOKEN: &str = "{directory}";
const NAME_TOKEN: &str = "{name}";
const EXTENSION_TOKEN: &str = "{extension}";

// Ordered list of action ids shown for an entry kind (the literal "separator" draws a divider).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct ActionList {
    #[serde(default)]
    actions: Vec<String>,
}

// A file-type rule: files whose extension matches use these actions instead of [file].
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct FileType {
    #[serde(default)]
    extensions: Vec<String>,
    #[serde(default)]
    actions: Vec<String>,
}

fn enabled_by_default() -> bool {
    true
}

// User-defined process action. Commands execute directly with argv (never through a shell), so
// paths containing spaces remain one argument and config values cannot inject shell operators.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CustomAction {
    pub id: String,
    pub label: String,
    #[serde(default = "default_custom_icon")]
    pub icon: String,
    #[serde(default)]
    pub targets: Vec<String>,
    #[serde(default)]
    pub extensions: Vec<String>,
    pub command: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default = "enabled_by_default")]
    pub enabled: bool,
}

fn default_custom_icon() -> String {
    DEFAULT_CUSTOM_ICON.to_string()
}

// The full context-menu layout. Field names match the TOML table names and are sent to the
// frontend as-is (snake_case).
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
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
    // Extra entries appended to the matching context menu. Kept in the same user TOML as the
    // predefined layout so ordering in this list is the user's custom-action ordering.
    #[serde(default)]
    pub custom_action: Vec<CustomAction>,
}

// Bundled defaults, used when the user has no context_menu.toml yet (or it can't be read).
const DEFAULT_CONTEXT_MENU: &str = include_str!("../../context_menu.default.toml");

pub fn parse(content: &str) -> Result<ContextMenu, String> {
    toml::from_str(content).map_err(|e| e.to_string())
}

pub fn config_path(config_dir: &Path) -> PathBuf {
    config_dir.join(CONTEXT_MENU_FILE)
}

// Load the layout from `config_dir/context_menu.toml`, falling back to the bundled defaults when
// the user has no file yet (or it can't be read). Shared by the Tauri command and the CLI.
pub fn load_core(config_dir: &Path) -> Result<ContextMenu, String> {
    match std::fs::read_to_string(config_path(config_dir)) {
        Ok(content) => parse(&content),
        Err(_) => parse(DEFAULT_CONTEXT_MENU),
    }
}

pub fn normalize(menu: &mut ContextMenu) -> Result<(), String> {
    let mut ids = HashSet::new();
    for action in &mut menu.custom_action {
        action.id = action.id.trim().to_string();
        action.label = action.label.trim().to_string();
        action.icon = action.icon.trim().to_string();
        action.command = action.command.trim().to_string();

        if action.id.is_empty()
            || !action
                .id
                .chars()
                .all(|character| character.is_ascii_alphanumeric() || "_-".contains(character))
        {
            return Err("Custom action ids may only contain letters, numbers, _ and -".to_string());
        }
        if !ids.insert(action.id.clone()) {
            return Err(format!("Duplicate custom action id: {}", action.id));
        }
        if action.label.is_empty() {
            return Err(format!("Custom action {} needs a label", action.id));
        }
        if action.command.is_empty() {
            return Err(format!("Custom action {} needs a command", action.id));
        }
        if action.icon.is_empty() {
            action.icon = default_custom_icon();
        }

        action.targets = action
            .targets
            .iter()
            .map(|target| target.trim().to_lowercase())
            .filter(|target| {
                target == TARGET_DIRECTORY || target == TARGET_FOLDER || target == TARGET_FILE
            })
            .collect();
        action.targets.sort();
        action.targets.dedup();
        if action.targets.is_empty() {
            return Err(format!(
                "Custom action {} needs at least one target",
                action.id
            ));
        }

        action.extensions = action
            .extensions
            .iter()
            .map(|extension| extension.trim().trim_start_matches('.').to_lowercase())
            .filter(|extension| !extension.is_empty())
            .collect();
        action.extensions.sort();
        action.extensions.dedup();
    }
    Ok(())
}

fn replace_tokens(value: &str, path: &str, directory: &str, name: &str, extension: &str) -> String {
    value
        .replace(PATH_TOKEN, path)
        .replace(DIRECTORY_TOKEN, directory)
        .replace(NAME_TOKEN, name)
        .replace(EXTENSION_TOKEN, extension)
}

fn expanded_command(command: &str, home: &Path) -> PathBuf {
    command
        .strip_prefix("~/")
        .map(|relative| home.join(relative))
        .unwrap_or_else(|| PathBuf::from(command))
}

// What a run actually launched: the resolved executable, the expanded argv and the child's pid.
// The GUI ignores it; the CLI reports it so an agent can see how the tokens expanded.
#[derive(Clone, Debug, Serialize)]
pub struct SpawnedAction {
    pub id: String,
    pub command: String,
    pub args: Vec<String>,
    pub directory: String,
    pub pid: u32,
}

// Execute a saved action by id. The command is loaded from disk rather than accepted from the
// caller, and argv is passed directly to the process without shell parsing. An argument equal to
// {paths} expands to one argv item per selected path; the other placeholders are scalar.
// Blocking: callers run it off the main thread (the GUI through spawn_blocking).
pub fn run_action_core(
    config_dir: &Path,
    home: &Path,
    action_id: &str,
    clicked_path: &str,
    paths: &[String],
) -> Result<SpawnedAction, String> {
    let menu = load_core(config_dir)?;
    let action = menu
        .custom_action
        .into_iter()
        .find(|candidate| candidate.id == action_id && candidate.enabled)
        .ok_or_else(|| format!("Unknown or disabled custom action: {action_id}"))?;

    let clicked = PathBuf::from(clicked_path);
    if !clicked.exists() {
        return Err("Custom actions only support existing local paths".to_string());
    }
    let directory = if clicked.is_dir() {
        clicked.clone()
    } else {
        clicked
            .parent()
            .map(Path::to_path_buf)
            .ok_or_else(|| "The selected file has no parent directory".to_string())?
    };
    let name = clicked
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_string();
    let extension = clicked
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_string();
    let directory_string = directory.to_string_lossy().into_owned();
    let selected: Vec<String> = if paths.is_empty() {
        vec![clicked_path.to_string()]
    } else {
        paths.to_vec()
    };
    let mut args = Vec::new();
    for argument in action.args {
        if argument == PATHS_TOKEN {
            args.extend(selected.iter().cloned());
        } else {
            args.push(replace_tokens(
                &argument,
                clicked_path,
                &directory_string,
                &name,
                &extension,
            ));
        }
    }

    let command = expanded_command(&action.command, home);
    let child = Command::new(&command)
        .args(&args)
        .current_dir(&directory)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(SpawnedAction {
        id: action.id,
        command: command.to_string_lossy().into_owned(),
        args,
        directory: directory_string,
        pid: child.id(),
    })
}
