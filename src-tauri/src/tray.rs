use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Runtime, WebviewWindow};

// The window a single-window action (center) should target: the focused one, else any.
fn focused_or_first<R: Runtime>(app: &AppHandle<R>) -> Option<WebviewWindow<R>> {
    let windows = app.webview_windows();
    windows
        .values()
        .find(|w| w.is_focused().unwrap_or(false))
        .or_else(|| windows.values().next())
        .cloned()
}

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<()> {
    let center_window = MenuItem::with_id(app, "center_window", "Center Window", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(app, &[&center_window, &hide, &separator, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .icon_as_template(true)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            "hide" => {
                // Hide every window (the whole app tucks into the tray).
                for window in app.webview_windows().values() {
                    let _ = window.hide();
                }
            }
            "center_window" => {
                if let Some(window) = focused_or_first(app) {
                    let _ = window.center();
                }
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                // Bring the whole app back: show all windows, focus one.
                for window in app.webview_windows().values() {
                    let _ = window.show();
                }
                if let Some(window) = focused_or_first(app) {
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
