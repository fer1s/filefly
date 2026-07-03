//! Multi-window support. New windows are clones of the "main" window's chrome (size, transparency,
//! decorations); each gets a unique label so the window-state plugin persists its geometry and the
//! frontend keys its own tab session by label (see tabs/utils.ts). Tray/Dock actions target the
//! focused window via `target_window` rather than assuming "main".

use std::sync::atomic::{AtomicU32, Ordering};

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

// Serial for runtime-created window labels ("win-1", "win-2", …). "main" is reserved for the
// window declared in tauri.conf.json.
static WINDOW_COUNTER: AtomicU32 = AtomicU32::new(1);

// Apply the per-window native chrome that tauri.conf can't (Windows acrylic). macOS transparency
// is handled by the builder's `.transparent(true)` + macos-private-api, so nothing to do there.
pub fn configure_window(window: &WebviewWindow) {
    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::apply_acrylic;
        let _ = apply_acrylic(window, Some((18, 18, 18, 180)));
    }
    #[cfg(not(target_os = "windows"))]
    let _ = window;
}

// Percent-encode a string so it survives as a URL query value. Encodes every byte outside the
// unreserved set (RFC 3986); paths contain spaces, `&`, `#`, and non-ASCII, all of which would
// otherwise break the query. The frontend decodes it with decodeURIComponent (see tabs/utils.ts).
fn encode_query(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for byte in input.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }
    out
}

// Create a new browser window matching the main window's chrome. Starts hidden; the frontend
// reveals it once its first listing is painted (same flow as main — see App.tsx revealWindow).
// When `start_path` is given, the window opens a single tab rooted there (carried as a `startPath`
// query param the frontend reads at mount); otherwise it follows the normal startup preference.
pub fn create_window(app: &AppHandle, start_path: Option<&str>) -> tauri::Result<WebviewWindow> {
    let n = WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    let label = format!("win-{n}");
    let url = match start_path {
        Some(path) => {
            WebviewUrl::App(format!("index.html?startPath={}", encode_query(path)).into())
        }
        None => WebviewUrl::default(),
    };
    let window = WebviewWindowBuilder::new(app, label, url)
        .title("File Browser")
        .inner_size(950.0, 600.0)
        .min_inner_size(950.0, 600.0)
        .resizable(true)
        .transparent(true)
        .decorations(true)
        .shadow(true)
        .center()
        .visible(false)
        .build()?;
    configure_window(&window);
    Ok(window)
}

// The window tray/Dock actions should act on: the focused one if any, otherwise any open window.
// Returns None only when every window has been closed (app living in the tray).
pub fn target_window(app: &AppHandle) -> Option<WebviewWindow> {
    let windows = app.webview_windows();
    windows
        .values()
        .find(|w| w.is_focused().unwrap_or(false))
        .or_else(|| windows.values().next())
        .cloned()
}

#[tauri::command]
pub fn open_new_window(app: AppHandle) -> Result<(), String> {
    create_window(&app, None).map(|_| ()).map_err(|e| e.to_string())
}

// Open a new file-browser window rooted at `path` (e.g. one of the app's data directories from the
// Storage settings). Same as open_new_window but the fresh window starts at the given folder.
#[tauri::command]
pub fn open_path_in_new_window(app: AppHandle, path: String) -> Result<(), String> {
    create_window(&app, Some(&path))
        .map(|_| ())
        .map_err(|e| e.to_string())
}
