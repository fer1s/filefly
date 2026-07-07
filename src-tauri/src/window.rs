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
    let url = match start_path {
        Some(path) => {
            WebviewUrl::App(format!("index.html?startPath={}", encode_query(path)).into())
        }
        None => WebviewUrl::default(),
    };
    build_window(app, url)
}

// Open a detached properties window for a single entry: loads `index.html?panel=properties&path=…`,
// which the frontend detects at mount (see main.tsx) to render only the Properties surface. A fresh
// window is spawned per call (unique `properties-N` label). Small and opaque; starts hidden and the
// frontend reveals it once the entry's metadata has loaded.
pub fn create_properties_window(app: &AppHandle, path: &str) -> tauri::Result<WebviewWindow> {
    let n = WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    let label = format!("properties-{n}");
    let url = WebviewUrl::App(
        format!("index.html?panel=properties&path={}", encode_query(path)).into(),
    );
    let window = WebviewWindowBuilder::new(app, label, url)
        .title("Properties")
        .inner_size(440.0, 520.0)
        .min_inner_size(320.0, 360.0)
        .resizable(true)
        .transparent(false)
        .decorations(true)
        .shadow(true)
        .center()
        .visible(false)
        .build()?;
    configure_window(&window);
    Ok(window)
}

// Open a window that reveals a single file: rooted at the file's parent folder (as `startPath`),
// with the file itself carried as a `reveal` query param so the frontend selects it once the
// listing loads (see DirectoryProvider). Mirrors Finder's "Show in Finder".
pub fn create_reveal_window(app: &AppHandle, file: &str) -> tauri::Result<WebviewWindow> {
    let parent = std::path::Path::new(file)
        .parent()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_default();
    let url = WebviewUrl::App(
        format!(
            "index.html?startPath={}&reveal={}",
            encode_query(&parent),
            encode_query(file)
        )
        .into(),
    );
    build_window(app, url)
}

// Build a new window with the main window's chrome at the given URL. Starts hidden; the frontend
// reveals it once its first listing is painted (same flow as main — see App.tsx revealWindow).
fn build_window(app: &AppHandle, url: WebviewUrl) -> tauri::Result<WebviewWindow> {
    let n = WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    let label = format!("win-{n}");
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

// Open a detached preview window for a single file: loads `index.html?panel=preview&path=<file>`,
// which the frontend detects at mount (see main.tsx) to render only the Preview surface. A fresh
// window is spawned per call (unique `preview-N` label) so several previews can sit side by side.
// Smaller than a browser window and starts hidden — the frontend reveals it once the file loads.
pub fn create_preview_window(app: &AppHandle, file: &str) -> tauri::Result<WebviewWindow> {
    let n = WINDOW_COUNTER.fetch_add(1, Ordering::Relaxed);
    let label = format!("preview-{n}");
    let url = WebviewUrl::App(
        format!("index.html?panel=preview&path={}", encode_query(file)).into(),
    );
    // Opaque (unlike the browser windows' vibrancy): a content window framed by the native
    // titlebar, not a translucent panel — otherwise the desktop/other windows show through.
    let window = WebviewWindowBuilder::new(app, label, url)
        .title("Preview")
        .inner_size(820.0, 620.0)
        .min_inner_size(420.0, 320.0)
        .resizable(true)
        .transparent(false)
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
    create_window(&app, None)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

// Open a new file-browser window rooted at `path` (e.g. one of the app's data directories from the
// Storage settings). Same as open_new_window but the fresh window starts at the given folder.
#[tauri::command]
pub fn open_path_in_new_window(app: AppHandle, path: String) -> Result<(), String> {
    create_window(&app, Some(&path))
        .map(|_| ())
        .map_err(|e| e.to_string())
}

// Open the built-in preview for `path` in its own window (used when the openPreviewInWindow
// setting is on, in place of the in-app overlay).
#[tauri::command]
pub fn open_preview_window(app: AppHandle, path: String) -> Result<(), String> {
    create_preview_window(&app, &path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

// Open the properties for `path` in its own window (used when the openPropertiesInWindow setting is
// on, in place of the in-app dialog).
#[tauri::command]
pub fn open_properties_window(app: AppHandle, path: String) -> Result<(), String> {
    create_properties_window(&app, &path)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
