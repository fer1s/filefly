// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;
mod utils;
mod filesystem;
mod functions;
mod dock_menu;

use tauri::Manager;
#[cfg(target_os = "windows")]
use window_vibrancy::apply_acrylic;

fn main() {
    tauri::Builder::default()
        // Restore geometry, but NOT visibility: the window starts hidden (visible:false) and the
        // frontend shows it once the first listing is painted, so there's no blank-window flash.
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::all()
                        & !tauri_plugin_window_state::StateFlags::VISIBLE,
                )
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_drag::init())
        .setup(|app| {
            tray::create_tray(app.handle())?;
            dock_menu::setup(app.handle());

            // Trim the thumbnail cache to its size budget, off the UI thread.
            if let Ok(cache_dir) = app.path().app_cache_dir() {
                let thumbnails = cache_dir.join("thumbnails");
                std::thread::spawn(move || {
                    filesystem::fs::prune_thumbnail_cache(&thumbnails)
                });
            }

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
            filesystem::volumes::eject_volume,
            filesystem::fs::get_entry,
            filesystem::fs::get_dir_size,
            filesystem::fs::get_recent_files,
            filesystem::fs::get_thumbnail,
            filesystem::fs::read_directory,
            filesystem::fs::search_directory,
            filesystem::fs::can_write,
            filesystem::fs::open_file,
            filesystem::fs::copy_entry,
            filesystem::fs::move_entry,
            filesystem::fs::rename_entry,
            filesystem::fs::create_folder,
            filesystem::fs::copy_image,
            filesystem::fs::delete_entry,
            filesystem::fs::restore_trashed,
            filesystem::fs::delete_entry_permanently,
            filesystem::fs::empty_trash,
            filesystem::tags::get_tags_for,
            filesystem::tags::set_file_tags,
            filesystem::tags::find_tagged,
            filesystem::tags::list_all_tags,
            functions::terminal::open_in_terminal,
            functions::markdown::md_to_html,
            functions::system::open_full_disk_access_settings,
            functions::keymap::get_keymap,
            functions::context_menu::get_context_menu,
            functions::settings::get_settings,
            functions::settings::set_settings,
            functions::sidebar::get_sidebar_groups,
            functions::sidebar::set_sidebar_group_name,
            functions::sidebar::set_sidebar_order,
            functions::sidebar::set_sidebar_items,
            functions::sidebar::set_hidden_presets,
            functions::sidebar::add_sidebar_group,
            functions::sidebar::delete_sidebar_group,
            functions::folder_columns::get_folder_columns,
            functions::folder_columns::set_folder_columns,
            functions::folder_columns::get_folder_view,
            functions::folder_columns::set_folder_view,
            functions::folder_columns::get_folder_sort,
            functions::folder_columns::set_folder_sort,
            functions::folder_columns::get_folder_zoom,
            functions::folder_columns::set_folder_zoom,
            dock_menu::push_recent_folder,
            dock_menu::clear_recent_folders,
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
