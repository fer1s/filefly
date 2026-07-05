//! Library crate shared by the two binaries: the Tauri GUI app (`src/main.rs`) and the headless
//! CLI (`src/bin/sfb.rs`). The `filesystem` module holds the file-operation cores both drive, so
//! the CLI and the GUI stay a single source of truth for how files are listed, copied, and trashed.
//!
//! Deliberately holds NO `tauri::generate_context!`/`generate_handler!`: those live in `main.rs`.
//! `generate_context!` validates the bundle's `externalBin` (the staged `sfb` sidecar) at compile
//! time — keeping it out of the library means building `sfb` doesn't require `sfb` to already exist.

// Debug-only tracing for the size index (compiled out of release builds). Defined at the crate root
// so modules can call it as `crate::dlog!`.
#[macro_export]
macro_rules! dlog {
    ($($arg:tt)*) => {
        #[cfg(debug_assertions)]
        println!("[size-index] {}", format!($($arg)*));
    };
}

pub mod dock_menu;
pub mod filesystem;
pub mod functions;
pub mod ignore;
pub mod index;
pub mod tray;
pub mod watcher;
pub mod utils;
pub mod window;
