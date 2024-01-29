use tauri::SystemTray;
use tauri::{CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};

pub fn create_tray() -> SystemTray {
    let mut tray_menu = SystemTrayMenu::new();

    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let center_window = CustomMenuItem::new("center_window".to_string(), "Center Window");

    tray_menu = tray_menu
        .add_item(center_window)
        .add_item(hide)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    SystemTray::new().with_menu(tray_menu)
}