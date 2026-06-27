// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;
mod utils;
mod filesystem;
mod functions;

#[cfg(target_os = "windows")]
use tauri::Manager;
#[cfg(target_os = "windows")]
use window_vibrancy::apply_acrylic;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            tray::create_tray(app.handle())?;

            #[cfg(target_os = "windows")]
            {
                let window = app.get_webview_window("main").unwrap();
                apply_acrylic(&window, Some((18, 18, 18, 180)))
                    .expect("Unsupported platform! 'apply_acrylic' is only supported on Windows");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            filesystem::volumes::get_host_name,
            filesystem::volumes::get_volumes,
            filesystem::fs::get_entry,
            filesystem::fs::get_dir_size,
            filesystem::fs::get_thumbnail,
            filesystem::fs::read_directory,
            filesystem::fs::open_file,
            filesystem::fs::copy_entry,
            filesystem::fs::move_entry,
            filesystem::fs::rename_entry,
            filesystem::fs::delete_entry,
            functions::terminal::open_in_terminal,
            functions::markdown::md_to_html,
            functions::system::open_full_disk_access_settings,
            functions::keymap::get_keymap,
            functions::folder_columns::get_folder_columns,
            functions::folder_columns::set_folder_columns,
            functions::folder_columns::get_folder_view,
            functions::folder_columns::set_folder_view,
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
