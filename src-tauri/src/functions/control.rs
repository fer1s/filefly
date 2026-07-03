//! Headless control channel: a Unix-domain socket that lets external tools (the `sfb` CLI, and
//! through it an MCP server) drive the running GUI — navigate, open a window at a path, read the
//! live UI state. This is the counterpart to `sfb`'s filesystem cores: those touch the disk
//! directly, this reaches into the running app.
//!
//! Protocol: newline-delimited JSON, one request per connection.
//!   → {"action":"navigate","args":{"path":"/tmp"}}
//!   ← {"ok":true,"data":{"navigated":"/tmp"}}   |   {"ok":false,"error":"…"}
//!
//! The socket lives at `<app_config_dir>/sfb-control.sock` — the same directory `sfb` already
//! resolves — with 0600 perms, so only the current user can reach it (no network exposure).
//!
//! UI state (open windows, tabs, current path, view) lives in the frontend; each window mirrors its
//! snapshot here via `set_ui_state` on every change, so `get-state` can answer without a round-trip
//! to the webview.

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde_json::{json, Value};
use tauri::{AppHandle, State};

// Per-window UI snapshots (JSON strings) keyed by window label, mirrored from the frontend.
// `probe_seq`/`probe_result` back the request/response `probe` action: Rust emits a probe request
// with a fresh id and blocks until the frontend calls `set_probe_result` with a matching id.
#[derive(Default)]
pub struct ControlState {
    snapshots: Mutex<HashMap<String, String>>,
    probe_seq: AtomicU64,
    probe_result: Mutex<Option<(u64, String)>>,
}

// Whether the app runs in debug mode. The control socket (navigate / open-window / state) is always
// available so `sfb` stays useful for AI automation, but the *introspection* surface (the `probe`
// action, which dumps live DOM/drag internals) is gated behind this: on only in dev builds, or when
// a release build is explicitly launched with `--debug` or `SFB_DEBUG=1`. Production is off by
// default, so no local process can dump the app's internals.
pub fn is_debug_mode() -> bool {
    if cfg!(debug_assertions) {
        return true;
    }
    let env_on = std::env::var("SFB_DEBUG")
        .map(|value| matches!(value.as_str(), "1" | "true" | "TRUE" | "yes"))
        .unwrap_or(false);
    env_on || std::env::args().any(|arg| arg == "--debug")
}

// Frontend → Rust mirror of one window's live UI state. Called on mount and whenever the path,
// view, or tab set changes. The calling window is injected by Tauri, so state is keyed by label.
#[tauri::command]
pub fn set_ui_state(window: tauri::WebviewWindow, state: String, control: State<ControlState>) {
    control
        .snapshots
        .lock()
        .unwrap()
        .insert(window.label().to_string(), state);
}

// Frontend → Rust reply to a `probe` request (see the `probe` action): the window computes the
// requested drag-drop diagnostics and returns them here, tagged with the request id it received.
#[tauri::command]
pub fn set_probe_result(id: u64, data: String, control: State<ControlState>) {
    *control.probe_result.lock().unwrap() = Some((id, data));
}

// Start the control socket listener (no-op off Unix). Called once from the app's setup.
#[cfg(unix)]
pub fn start(app: AppHandle) {
    use std::os::unix::fs::PermissionsExt;
    use std::os::unix::net::UnixListener;

    let Ok(dir) = tauri::Manager::path(&app).app_config_dir() else {
        return;
    };
    let _ = std::fs::create_dir_all(&dir);
    let socket = dir.join("sfb-control.sock");
    // Clear a stale socket left by a previous run (bind fails on an existing path).
    let _ = std::fs::remove_file(&socket);

    let listener = match UnixListener::bind(&socket) {
        Ok(listener) => listener,
        Err(error) => {
            eprintln!("control: could not bind {}: {error}", socket.display());
            return;
        }
    };
    let _ = std::fs::set_permissions(&socket, std::fs::Permissions::from_mode(0o600));

    std::thread::spawn(move || {
        for stream in listener.incoming().flatten() {
            let app = app.clone();
            // One thread per connection: dispatch may hop to the main thread and block.
            std::thread::spawn(move || handle_connection(app, stream));
        }
    });
}

#[cfg(not(unix))]
pub fn start(_app: AppHandle) {}

#[cfg(unix)]
fn handle_connection(app: AppHandle, stream: std::os::unix::net::UnixStream) {
    use std::io::{BufRead, BufReader, Write};

    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    if reader.read_line(&mut line).is_err() {
        return;
    }
    let response = dispatch(&app, line.trim());
    let mut stream = reader.into_inner();
    let _ = writeln!(stream, "{response}");
}

// Parse one request line and run its action, wrapping the result in the ok/error envelope.
#[cfg(unix)]
fn dispatch(app: &AppHandle, line: &str) -> Value {
    let request: Value = match serde_json::from_str(line) {
        Ok(value) => value,
        Err(error) => return json!({ "ok": false, "error": format!("bad request: {error}") }),
    };
    let action = request.get("action").and_then(Value::as_str).unwrap_or("");
    let args = request.get("args").cloned().unwrap_or(Value::Null);
    match run_action(app, action, &args) {
        Ok(data) => json!({ "ok": true, "data": data }),
        Err(error) => json!({ "ok": false, "error": error }),
    }
}

#[cfg(unix)]
fn run_action(app: &AppHandle, action: &str, args: &Value) -> Result<Value, String> {
    use tauri::{Emitter, Manager};

    match action {
        // Report the live UI of every open window (path, view, tabs), as mirrored by the frontend.
        "get-state" => {
            let control = app.state::<ControlState>();
            let snapshots = control.snapshots.lock().unwrap();
            let windows: serde_json::Map<String, Value> = snapshots
                .iter()
                .map(|(label, snapshot)| {
                    (
                        label.clone(),
                        serde_json::from_str(snapshot).unwrap_or(Value::Null),
                    )
                })
                .collect();
            // `debug` lets a caller discover whether the introspection surface (probe) is available.
            Ok(json!({ "windows": windows, "debug": is_debug_mode() }))
        }
        // Navigate the focused window's active tab to `path` (best-effort; applied in the frontend).
        "navigate" => {
            let path = args
                .get("path")
                .and_then(Value::as_str)
                .ok_or("navigate requires args.path")?;
            let window = crate::window::target_window(app).ok_or("no open window to navigate")?;
            app.emit_to(window.label(), "control://navigate", path)
                .map_err(|error| error.to_string())?;
            Ok(json!({ "navigated": path }))
        }
        // Ask the focused window to run drag-drop hit-test diagnostics and return them. The
        // frontend computes entry rects + which folder a point/target resolves to (see
        // useControlBridge) and replies via `set_probe_result`; we block on a matching id.
        "probe" => {
            // Introspection is debug-only: refuse in production so the app's internals aren't
            // dumpable by any local process. Automation actions above stay open (AI-friendly).
            if !is_debug_mode() {
                return Err(
                    "probe is disabled: launch the app with --debug or SFB_DEBUG=1".to_string(),
                );
            }
            let control = app.state::<ControlState>();
            let id = control.probe_seq.fetch_add(1, Ordering::SeqCst) + 1;
            *control.probe_result.lock().unwrap() = None;
            let window = crate::window::target_window(app).ok_or("no open window to probe")?;
            app.emit_to(window.label(), "control://probe", json!({ "id": id, "args": args }))
                .map_err(|error| error.to_string())?;
            // Poll for the reply (the webview needs a moment to hit-test the DOM and answer).
            for _ in 0..150 {
                std::thread::sleep(std::time::Duration::from_millis(20));
                if let Some((reply_id, data)) = control.probe_result.lock().unwrap().as_ref() {
                    if *reply_id == id {
                        return Ok(serde_json::from_str(data).unwrap_or(Value::Null));
                    }
                }
            }
            Err("probe timed out (is a browser window open and focused?)".to_string())
        }
        // Create / close / reorder a tab in the focused window (applied in the frontend via
        // useControlBridge). `op` is "new" | "close" | "move"; extra args ride along in the payload.
        "tab" => {
            let op = args
                .get("op")
                .and_then(Value::as_str)
                .ok_or("tab requires args.op (new|close|move)")?;
            let window = crate::window::target_window(app).ok_or("no open window for tab op")?;
            app.emit_to(window.label(), "control://tab", args)
                .map_err(|error| error.to_string())?;
            Ok(json!({ "tab": op }))
        }
        // Open a new window rooted at `path` (created on the main thread; returns once built).
        "open-window" => {
            let path = args
                .get("path")
                .and_then(Value::as_str)
                .ok_or("open-window requires args.path")?
                .to_string();
            open_window_on_main(app, path)
        }
        other => Err(format!("unknown action '{other}'")),
    }
}

// Window creation must run on the main thread; hop there and wait for the Result via a channel.
#[cfg(unix)]
fn open_window_on_main(app: &AppHandle, path: String) -> Result<Value, String> {
    let (tx, rx) = std::sync::mpsc::channel();
    let app_for_main = app.clone();
    let path_for_main = path.clone();
    app.run_on_main_thread(move || {
        let result = crate::window::create_window(&app_for_main, Some(&path_for_main))
            .map(|_| ())
            .map_err(|error| error.to_string());
        let _ = tx.send(result);
    })
    .map_err(|error| error.to_string())?;
    rx.recv().map_err(|error| error.to_string())??;
    Ok(json!({ "opened": path }))
}
