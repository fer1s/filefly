//! Custom macOS Dock right-click menu: our own recent-folders list (NOT Finder's / NSDocument
//! recents) plus a small set of quick actions. The whole thing is data-driven — recents come from
//! a persisted ring buffer the frontend feeds via `push_recent_folder`, and quick actions are a
//! static table (`QUICK_ACTIONS`) so adding one is a one-line edit, no menu-building code touched.
//!
//! On non-macOS platforms only the recents store compiles (harmless no-op menu-wise), so the
//! `push_recent_folder`/`clear_recent_folders` commands stay cross-platform.

use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};

use tauri::{AppHandle, Manager};

/// Max recent folders kept in the Dock menu.
const MAX_RECENTS: usize = 8;

/// Quick actions shown under the recents. `(id, label)` — the id is emitted to the frontend on
/// click as `dock://action`. Add a row here to add a menu item; nothing else changes.
#[cfg(target_os = "macos")]
const QUICK_ACTIONS: &[(&str, &str)] = &[
    ("new-tab", "New Tab"),
    ("home", "Go to Home"),
    ("volumes", "Go to Volumes"),
];

/// Process-wide Dock state. Set once during `setup`. `handler_ptr` is a leaked `Retained<DockHandler>`
/// stored as a `usize` because Retained is neither Send nor Sync; it is only ever dereferenced on the
/// main thread inside the Dock callbacks.
struct DockState {
    app: AppHandle,
    recents: Mutex<Vec<String>>,
}

static DOCK: OnceLock<DockState> = OnceLock::new();

fn recents_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_config_dir()
        .ok()
        .map(|dir| dir.join("recents.json"))
}

fn load_recents(app: &AppHandle) -> Vec<String> {
    recents_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok())
        .unwrap_or_default()
}

fn save_recents(app: &AppHandle, recents: &[String]) {
    if let Some(path) = recents_path(app) {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(json) = serde_json::to_string(recents) {
            let _ = std::fs::write(path, json);
        }
    }
}

/// Frontend calls this whenever it navigates to a folder. Dedups, moves to front, caps the list,
/// and persists. Cheap enough to call on every navigation.
#[tauri::command]
pub fn push_recent_folder(path: String) {
    let Some(state) = DOCK.get() else { return };
    if path.trim().is_empty() {
        return;
    }
    let mut recents = state.recents.lock().unwrap();
    recents.retain(|p| p != &path);
    recents.insert(0, path);
    recents.truncate(MAX_RECENTS);
    save_recents(&state.app, &recents);
}

#[tauri::command]
pub fn clear_recent_folders() {
    let Some(state) = DOCK.get() else { return };
    let mut recents = state.recents.lock().unwrap();
    recents.clear();
    save_recents(&state.app, &recents);
}

/// Bring the main window to the front and emit a navigation event the frontend acts on.
fn emit_navigate(path: &str) {
    let Some(state) = DOCK.get() else { return };
    focus_main_window(&state.app);
    use tauri::Emitter;
    let _ = state.app.emit("dock://navigate", path.to_string());
}

fn emit_action(id: &str) {
    let Some(state) = DOCK.get() else { return };
    focus_main_window(&state.app);
    use tauri::Emitter;
    let _ = state.app.emit("dock://action", id.to_string());
}

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// ---------------------------------------------------------------------------
// macOS native menu
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
mod imp {
    use super::*;

    use objc2::rc::Retained;
    use objc2::runtime::{AnyClass, AnyObject, ClassBuilder, NSObject, Sel};
    use objc2::{define_class, msg_send, sel, AnyThread, MainThreadOnly};
    use objc2_app_kit::{NSApplication, NSMenu, NSMenuItem};
    use objc2_foundation::{ns_string, MainThreadMarker, NSString};

    // The menu target: an NSObject subclass exposing the two action selectors the menu items point
    // at. It holds no state — the clicked item carries its payload in `representedObject`.
    define_class!(
        #[unsafe(super(NSObject))]
        #[name = "SitoDockHandler"]
        struct DockHandler;

        impl DockHandler {
            #[unsafe(method(openRecent:))]
            fn open_recent(&self, sender: &NSMenuItem) {
                if let Some(path) = represented_string(sender) {
                    emit_navigate(&path);
                }
            }

            #[unsafe(method(quickAction:))]
            fn quick_action(&self, sender: &NSMenuItem) {
                if let Some(id) = represented_string(sender) {
                    emit_action(&id);
                }
            }
        }
    );

    fn represented_string(item: &NSMenuItem) -> Option<String> {
        unsafe {
            let obj: *mut AnyObject = msg_send![item, representedObject];
            if obj.is_null() {
                return None;
            }
            let s: &NSString = &*(obj as *const NSString);
            Some(s.to_string())
        }
    }

    fn folder_label(path: &str) -> String {
        std::path::Path::new(path)
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| path.to_string())
    }

    fn make_item(
        mtm: MainThreadMarker,
        title: &str,
        action: Sel,
        payload: &str,
        target: &DockHandler,
    ) -> Retained<NSMenuItem> {
        let ns_title = NSString::from_str(title);
        let item = unsafe {
            NSMenuItem::initWithTitle_action_keyEquivalent(
                NSMenuItem::alloc(mtm),
                &ns_title,
                Some(action),
                ns_string!(""),
            )
        };
        let ns_payload = NSString::from_str(payload);
        unsafe {
            item.setRepresentedObject(Some(&ns_payload));
            item.setTarget(Some(target));
        }
        item
    }

    /// Build the Dock menu fresh on every right-click (the Dock calls `applicationDockMenu:` each
    /// time), so it always reflects the current recents.
    fn build_menu(mtm: MainThreadMarker) -> Retained<NSMenu> {
        let state = DOCK.get().unwrap();
        let handler: &DockHandler = unsafe { &*(HANDLER_PTR.get().copied().unwrap_or(0) as *const DockHandler) };
        let menu = NSMenu::new(mtm);

        let recents = state.recents.lock().unwrap().clone();
        if !recents.is_empty() {
            let header = NSMenuItem::new(mtm);
            header.setTitle(ns_string!("Recent Folders"));
            header.setEnabled(false);
            menu.addItem(&header);

            for path in &recents {
                let item = make_item(mtm, &folder_label(path), sel!(openRecent:), path, handler);
                menu.addItem(&item);
            }
            menu.addItem(&NSMenuItem::separatorItem(mtm));
        }

        for (id, label) in QUICK_ACTIONS {
            let item = make_item(mtm, label, sel!(quickAction:), id, handler);
            menu.addItem(&item);
        }

        menu
    }

    // The delegate method the Dock queries. `self`/`_cmd`/`_sender` are unused — everything comes
    // from the global DOCK state.
    extern "C" fn application_dock_menu(
        _this: &AnyObject,
        _cmd: Sel,
        _sender: &AnyObject,
    ) -> *mut NSMenu {
        let mtm = MainThreadMarker::new().expect("dock menu on main thread");
        Retained::autorelease_return(build_menu(mtm))
    }

    /// Install the custom Dock menu: create the shared handler, then reparent Tauri's existing app
    /// delegate under a fresh subclass that adds `applicationDockMenu:`. Non-destructive — the
    /// original delegate class and all its methods are inherited untouched.
    pub fn install() {
        let mtm = MainThreadMarker::new().expect("dock install on main thread");

        let handler: Retained<DockHandler> = unsafe { msg_send![DockHandler::alloc(), init] };
        let handler_ptr = Retained::into_raw(handler) as usize;
        let _ = HANDLER_PTR.set(handler_ptr);

        let app = NSApplication::sharedApplication(mtm);
        let Some(delegate) = app.delegate() else {
            return;
        };
        let superclass: &AnyClass = unsafe { msg_send![&*delegate, class] };

        let Some(mut builder) = ClassBuilder::new(c"SitoDockDelegate", superclass) else {
            return; // already registered (install called twice)
        };
        unsafe {
            builder.add_method(
                sel!(applicationDockMenu:),
                application_dock_menu as extern "C" fn(_, _, _) -> _,
            );
        }
        let new_class = builder.register();

        unsafe {
            let obj = Retained::as_ptr(&delegate) as *mut AnyObject;
            objc2::ffi::object_setClass(obj.cast(), (new_class as *const objc2::runtime::AnyClass).cast());
        }
    }

    // The shared menu-target handler, leaked as a raw pointer (Retained is neither Send nor Sync).
    // Only ever dereferenced on the main thread inside build_menu.
    static HANDLER_PTR: OnceLock<usize> = OnceLock::new();
}

/// Wire up the Dock menu. Call once from `setup`.
pub fn setup(app: &AppHandle) {
    let recents = load_recents(app);
    let _ = DOCK.set(DockState {
        app: app.clone(),
        recents: Mutex::new(recents),
    });

    #[cfg(target_os = "macos")]
    imp::install();
}
