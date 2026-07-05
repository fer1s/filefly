// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// The GUI app binary. It wires up Tauri using the shared modules from the library crate
// (`sito_file_browser_lib`), which the `sfb` CLI also links. `generate_context!` — which validates
// the `externalBin` sidecar at compile time — lives here, not in the lib, so building the CLI never
// requires the sidecar to already exist.
use sito_file_browser_lib::{
    dock_menu, filesystem, functions, ignore, index, tray, watcher, window,
};
use tauri::Manager;

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

            // Headless control channel (Unix socket) so `sfb` / an MCP server can drive the UI.
            app.manage(functions::control::ControlState::default());
            functions::control::start(app.handle().clone());

            // Persistent System handle for the status-bar OS stats (CPU deltas across polls).
            app.manage(functions::os_stats::StatsState::default());

            // Persistent SQLite index of recursive directory sizes (see index.rs). The app's own
            // data dir (where size_index.db lives) is ignored so our writes never feed a future
            // watcher back into itself. The cache is lazy: each folder is (re)walked on demand when
            // its own mtime no longer matches the cached row — no startup reconcile (which would
            // re-stat every path ever cached). Deep offline changes stay stale until the folder is
            // revisited; the Phase B watcher will close that gap in real time.
            let ignore_list = ignore::IgnoreList::new(
                app.path().app_data_dir().map(|d| vec![d]).unwrap_or_default(),
            );
            let size_index = index::init(app.handle())?;
            app.manage(size_index);
            app.manage(ignore_list);
            // Recursive watcher that keeps the size index fresh in real time for the viewed folder
            // (Phase B): the frontend calls watch_directory on navigation; changes bubble deltas
            // into cached ancestor sizes and emit dir-size-changed so the open view updates live.
            app.manage(watcher::DirWatcher::new());

            // Trim the thumbnail cache to its size budget, off the UI thread.
            if let Ok(cache_dir) = app.path().app_cache_dir() {
                let thumbnails = cache_dir.join("thumbnails");
                std::thread::spawn(move || filesystem::fs::prune_thumbnail_cache(&thumbnails));
            }

            // Apply the main window's native chrome the same way runtime-created windows get it.
            if let Some(main) = app.get_webview_window("main") {
                window::configure_window(&main);
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
            functions::markdown::md_render,
            functions::markdown::read_text_file,
            functions::markdown::write_text_file,
            functions::system::open_full_disk_access_settings,
            functions::system::open_system_monitor,
            functions::os_stats::get_system_stats,
            watcher::watch_directory,
            functions::keymap::get_keymap,
            functions::context_menu::get_context_menu,
            functions::settings::get_settings,
            functions::settings::set_settings,
            functions::settings::import_settings,
            functions::settings::export_settings,
            functions::storage::get_app_storage,
            functions::storage::clear_app_cache,
            filesystem::sftp::sftp_list_connections,
            filesystem::sftp::sftp_add_connection,
            filesystem::sftp::sftp_remove_connection,
            filesystem::sftp::sftp_home,
            filesystem::sftp::sftp_download,
            functions::control::set_ui_state,
            functions::control::set_probe_result,
            functions::handler::is_default_folder_handler,
            functions::handler::set_default_folder_handler,
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
            window::open_new_window,
            window::open_path_in_new_window,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // The app lives in the tray, so closing "main" hides it (reopen from the tray)
                // rather than quitting. Runtime windows (win-N) close normally.
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // On exit, drop the SFTP download cache (materialized remote files + ssh scripts) so it
            // doesn't linger across sessions. Other caches (thumbnails) are kept.
            if let tauri::RunEvent::Exit = &event {
                filesystem::sftp::clear_cache(app_handle);
            }

            // macOS routes "open this folder" (Terminal `open`, folder links, aliases) here when we
            // are the default folder handler — open each directory in a new window. Double-clicking
            // a folder inside Finder never reaches this; Finder keeps that itself (see handler.rs).
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        if path.is_dir() {
                            let _ = window::create_window(app_handle, Some(&path.to_string_lossy()));
                        }
                    }
                }
            }
            #[cfg(not(target_os = "macos"))]
            {
                let _ = (app_handle, event);
            }
        });
}
