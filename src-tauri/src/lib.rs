//! Library crate shared by the two binaries: the Tauri GUI app (`src/main.rs`) and the headless
//! CLI (`src/bin/sfb.rs`). The `filesystem` module holds the file-operation cores both drive, so
//! the CLI and the GUI stay a single source of truth for how files are listed, copied, and trashed.
//!
//! Deliberately holds NO `tauri::generate_context!`/`generate_handler!`: those live in `main.rs`.
//! `generate_context!` validates the bundle's `externalBin` (the staged `sfb` sidecar) at compile
//! time — keeping it out of the library means building `sfb` doesn't require `sfb` to already exist.

pub mod dock_menu;
pub mod filesystem;
pub mod functions;
pub mod tray;
pub mod utils;
pub mod window;
