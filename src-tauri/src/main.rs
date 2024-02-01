// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;
mod utils;
mod filesystem;
mod functions;

use tauri::Manager;
use window_shadows::set_shadow;
use window_vibrancy::apply_acrylic;

#[tauri::command]
fn hide_window(window: tauri::Window) {
    window.hide().unwrap();
}

fn main() {
    let tray = tray::create_tray();

    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            #[cfg(target_os = "windows")]
            apply_acrylic(&window, Some((18, 18, 18, 180)))
                .expect("Unsupported platform! 'apply_blur' is only supported on Windows");

            #[cfg(target_os = "windows")]
            set_shadow(&window, true).unwrap();

            Ok(())
        })
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            hide_window,
            filesystem::volumes::get_volumes,
            filesystem::fs::read_directory,
            filesystem::fs::open_file,
            functions::terminal::open_in_terminal,
            functions::markdown::md_to_html,
        ])
        .system_tray(tray)
        .on_system_tray_event(|app, event| match event {
            tauri::SystemTrayEvent::LeftClick { .. } => {
                let window = app.get_window("main").unwrap();
                window.show().unwrap();
            }
            tauri::SystemTrayEvent::MenuItemClick { id, .. } => {
                if id == "quit" {
                    app.exit(0);
                }
                if id == "hide" {
                    let window = app.get_window("main").unwrap();
                    window.hide().unwrap();
                }
                if id == "center_window" {
                    let window = app.get_window("main").unwrap();
                    window.center().unwrap();
                }
            }
            _ => {}
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                event.window().hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


