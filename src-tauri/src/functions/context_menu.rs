//! Tauri layer over the context-menu contract. The TOML model, validation and the action
//! execution core live in `filesystem::actions` so the `sfb` CLI runs the very same code; this
//! module only resolves app paths, moves the work off the main thread and emits the change event.

use std::path::PathBuf;

use tauri::{AppHandle, Emitter, Manager};

use crate::filesystem::actions;

pub use crate::filesystem::actions::{ActionList, ContextMenu, CustomAction, FileType};

const CONTEXT_MENU_CHANGED_EVENT: &str = "context-menu-changed";

fn config_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|e| e.to_string())
}

fn load(app: &AppHandle) -> Result<ContextMenu, String> {
    actions::load_core(&config_dir(app)?)
}

// Load the context-menu layout: the user's `context_menu.toml` in the app config dir if
// present, otherwise the bundled defaults.
#[tauri::command]
pub async fn get_context_menu(app: AppHandle) -> Result<ContextMenu, String> {
    tauri::async_runtime::spawn_blocking(move || load(&app))
        .await
        .map_err(|error| error.to_string())?
}

// Persist the complete layout and custom-action list. Settings owns editing, while this module
// owns validation and the on-disk context_menu.toml contract.
#[tauri::command]
pub async fn set_context_menu(
    app: AppHandle,
    mut menu: ContextMenu,
) -> Result<ContextMenu, String> {
    actions::normalize(&mut menu)?;
    let target = actions::config_path(&config_dir(&app)?);
    let serialized = toml::to_string_pretty(&menu).map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent).map_err(|error| error.to_string())?;
        }
        std::fs::write(target, serialized).map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())??;
    app.emit(CONTEXT_MENU_CHANGED_EVENT, menu.clone())
        .map_err(|error| error.to_string())?;
    Ok(menu)
}

// Execute a saved action by id (see `filesystem::actions::run_action_core` for the argv contract).
#[tauri::command]
pub async fn run_context_action(
    app: AppHandle,
    action_id: String,
    clicked_path: String,
    paths: Vec<String>,
) -> Result<(), String> {
    let config_dir = config_dir(&app)?;
    let home = app.path().home_dir().map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        actions::run_action_core(&config_dir, &home, &action_id, &clicked_path, &paths).map(|_| ())
    })
    .await
    .map_err(|error| error.to_string())?
}
