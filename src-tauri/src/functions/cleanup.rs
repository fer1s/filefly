use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::filesystem::fs::{dir_size_core, trash_entry_core};

// A folder the user registered to watch and periodically reclaim (dependency caches, build
// artifacts, launcher leftovers). Persisted as cleanup.toml in the app config dir. `path` is stored
// canonicalized so duplicates collapse regardless of how the user picked the folder, and `mode`
// decides what a cleanup removes (see MODE_CONTENTS / MODE_FOLDER).
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CleanupTarget {
    pub path: String,
    #[serde(default = "default_mode")]
    pub mode: String,
}

// cleanup.toml root. A struct (not a bare Vec) so the file can grow new top-level keys later
// without breaking the format.
#[derive(Debug, Deserialize, Serialize, Default)]
pub struct CleanupConfig {
    #[serde(default)]
    pub targets: Vec<CleanupTarget>,
}

// cleanup.toml lives directly in the app config dir, beside settings.toml and sidebar.toml.
const CLEANUP_FILE: &str = "cleanup.toml";

// Empty the folder but keep the folder itself — for caches whose parent must survive (e.g.
// ~/.gradle/caches, where the tool expects the directory to exist).
pub const MODE_CONTENTS: &str = "contents";
// Trash the registered folder itself — for whole obsolete directories (e.g. an old app version).
pub const MODE_FOLDER: &str = "folder";

// Emptying contents is the safer default: it never removes a directory another tool may expect.
fn default_mode() -> String {
    MODE_CONTENTS.to_string()
}

// Stable error codes the frontend maps to localized copy (see CLEANUP_ERROR on the frontend).
// Returned instead of prose so user-facing text stays in the translation dictionary.
const ERROR_NOT_ABSOLUTE: &str = "CLEANUP_NOT_ABSOLUTE";
const ERROR_NOT_A_DIR: &str = "CLEANUP_NOT_A_DIR";
const ERROR_PROTECTED: &str = "CLEANUP_PROTECTED_PATH";
const ERROR_DUPLICATE: &str = "CLEANUP_DUPLICATE";
const ERROR_UNKNOWN_TARGET: &str = "CLEANUP_UNKNOWN_TARGET";
const ERROR_INVALID_MODE: &str = "CLEANUP_INVALID_MODE";

// Absolute prefixes that must never be registered or cleaned. These are OS-owned (and largely
// SIP-protected on macOS, so a trash attempt would fail anyway) — refusing early gives the user a
// clear message instead of a partial, half-broken delete.
const PROTECTED_PREFIXES: &[&str] = &["/System", "/usr", "/bin", "/sbin", "/etc", "/dev"];

// Exact directories that must never be registered even though their children are fair game.
// Trashing one of these wholesale would take an entire install or user account with it.
const PROTECTED_EXACT: &[&str] = &["/Applications", "/Library", "/Volumes", "/private"];

// One registered target as the Storage panel sees it: the persisted fields plus the live recursive
// size, and whether the folder is still on disk. Mirrors CleanupTargetInfo on the frontend.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupTargetInfo {
    path: String,
    mode: String,
    // Recursively summed bytes, 0 when the folder is missing or empty.
    size: u64,
    // False when the folder no longer exists (tool uninstalled, path renamed). The row stays
    // registered so removing it is the user's explicit choice, never a silent drop.
    exists: bool,
}

// What one cleanup actually did. Reported honestly rather than as a bare success: a contents
// cleanup can partially fail (one locked child) while the rest is reclaimed, and the panel needs to
// show both the freed bytes and the failures.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupResult {
    // Bytes measured on the entries that were successfully moved to the Trash.
    freed: u64,
    // How many entries reached the Trash (1 for a whole-folder cleanup).
    removed: u32,
    // How many entries could not be trashed (permissions, in use, OS protection).
    failed: u32,
    // The first failure's message, for the error toast. None when nothing failed.
    first_error: Option<String>,
}

// Read cleanup.toml from a given config dir (empty config when absent/unreadable). Dir-based so the
// headless `sfb` CLI can share this exact core, matching functions/sidebar.rs.
pub fn read_config_from(config_dir: &Path) -> CleanupConfig {
    match std::fs::read_to_string(config_dir.join(CLEANUP_FILE)) {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => CleanupConfig::default(),
    }
}

// Write cleanup.toml into a given config dir, creating the dir if needed.
pub fn write_config_to(config_dir: &Path, config: &CleanupConfig) -> Result<(), String> {
    let serialized = toml::to_string_pretty(config).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(config_dir).map_err(|e| e.to_string())?;
    std::fs::write(config_dir.join(CLEANUP_FILE), serialized).map_err(|e| e.to_string())
}

// Validate a candidate target and return its canonical path. Enforced both when registering and
// again immediately before deleting, so a hand-edited cleanup.toml or a folder that turned into a
// symlink after being saved still can't widen the blast radius.
//
// Rejected: relative paths, non-directories, the filesystem root, any volume root under /Volumes,
// the user's home dir itself, OS-owned trees (PROTECTED_PREFIXES / PROTECTED_EXACT), and any
// ancestor of the app's own config dir (which holds settings.toml, the sidebar and the trash
// ledger).
fn guard_target(path: &str, config_dir: &Path, home: Option<&Path>) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(path);
    if !candidate.is_absolute() {
        return Err(ERROR_NOT_ABSOLUTE.to_string());
    }

    // canonicalize resolves symlinks and `..` before any of the checks below, so none of them can
    // be bypassed by aliasing a protected directory.
    let resolved = candidate
        .canonicalize()
        .map_err(|_| ERROR_NOT_A_DIR.to_string())?;
    if !resolved.is_dir() {
        return Err(ERROR_NOT_A_DIR.to_string());
    }

    // No parent means the filesystem root itself.
    if resolved.parent().is_none() {
        return Err(ERROR_PROTECTED.to_string());
    }

    if PROTECTED_EXACT
        .iter()
        .any(|entry| resolved.as_path() == Path::new(entry))
    {
        return Err(ERROR_PROTECTED.to_string());
    }
    if PROTECTED_PREFIXES
        .iter()
        .any(|prefix| resolved.starts_with(*prefix))
    {
        return Err(ERROR_PROTECTED.to_string());
    }

    // A mounted volume's root (/Volumes/<name>): exactly one component below /Volumes.
    if resolved.parent() == Some(Path::new("/Volumes")) {
        return Err(ERROR_PROTECTED.to_string());
    }

    if home == Some(resolved.as_path()) {
        return Err(ERROR_PROTECTED.to_string());
    }

    // Equal to, or an ancestor of, our own config dir — cleaning it would delete the app's
    // settings, sidebar and trash ledger.
    if config_dir.starts_with(&resolved) {
        return Err(ERROR_PROTECTED.to_string());
    }

    Ok(resolved)
}

// Expand a leading `~` to the user's home dir, so typed paths like `~/.gradle/caches` work. Only
// the leading tilde form is handled; anything else passes through untouched (guard_target then
// rejects non-absolute paths). A bare `~` resolves to the home dir itself, which guard_target
// refuses as protected.
fn expand_home(path: &str, home: Option<&Path>) -> String {
    if let Some(home) = home {
        if path == "~" {
            return home.to_string_lossy().into_owned();
        }
        if let Some(rest) = path.strip_prefix("~/") {
            return home.join(rest).to_string_lossy().into_owned();
        }
    }
    path.to_string()
}

fn normalize_mode(mode: &str) -> Result<String, String> {
    if mode == MODE_CONTENTS || mode == MODE_FOLDER {
        Ok(mode.to_string())
    } else {
        Err(ERROR_INVALID_MODE.to_string())
    }
}

fn config_dir_of(app: &AppHandle) -> Result<PathBuf, String> {
    app.path().app_config_dir().map_err(|e| e.to_string())
}

// Bytes an entry occupies: a recursive walk for directories, the file length otherwise. Measured
// before trashing so the panel can report what a cleanup actually reclaimed.
fn entry_size(path: &Path) -> u64 {
    if path.is_dir() {
        dir_size_core(&path.to_string_lossy())
    } else {
        std::fs::metadata(path).map(|meta| meta.len()).unwrap_or(0)
    }
}

// Every registered target with its live recursive size. Async + spawn_blocking because summing a
// dependency cache walks hundreds of thousands of files (see dir_size_core), which must never run
// on Tauri's main thread. Missing folders are reported with `exists: false` instead of being
// dropped, so the user decides whether to unregister them.
#[tauri::command]
pub async fn get_cleanup_targets(app: AppHandle) -> Result<Vec<CleanupTargetInfo>, String> {
    let config_dir = config_dir_of(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        read_config_from(&config_dir)
            .targets
            .into_iter()
            .map(|target| {
                let path = PathBuf::from(&target.path);
                let exists = path.is_dir();
                CleanupTargetInfo {
                    size: if exists { entry_size(&path) } else { 0 },
                    path: target.path,
                    mode: target.mode,
                    exists,
                }
            })
            .collect()
    })
    .await
    .map_err(|error| error.to_string())
}

// Register a folder to watch, storing its canonical path. The path is user-typed, so a leading `~`
// is expanded first. Rejects unsafe targets (see guard_target) and paths already registered, so the
// panel never grows a duplicate row.
#[tauri::command]
pub fn add_cleanup_target(app: AppHandle, path: String, mode: String) -> Result<(), String> {
    let config_dir = config_dir_of(&app)?;
    let home = app.path().home_dir().ok();
    let expanded = expand_home(path.trim(), home.as_deref());
    let resolved = guard_target(&expanded, &config_dir, home.as_deref())?;
    let mode = normalize_mode(&mode)?;
    let stored = resolved.to_string_lossy().into_owned();

    let mut config = read_config_from(&config_dir);
    if config.targets.iter().any(|target| target.path == stored) {
        return Err(ERROR_DUPLICATE.to_string());
    }
    config.targets.push(CleanupTarget {
        path: stored,
        mode,
    });
    write_config_to(&config_dir, &config)
}

// Unregister a folder. Only forgets the entry — nothing on disk is touched.
#[tauri::command]
pub fn remove_cleanup_target(app: AppHandle, path: String) -> Result<(), String> {
    let config_dir = config_dir_of(&app)?;
    let mut config = read_config_from(&config_dir);
    config.targets.retain(|target| target.path != path);
    write_config_to(&config_dir, &config)
}

// Switch what a cleanup removes for one target (empty its contents vs trash the folder itself),
// preserving every other target.
#[tauri::command]
pub fn set_cleanup_target_mode(app: AppHandle, path: String, mode: String) -> Result<(), String> {
    let config_dir = config_dir_of(&app)?;
    let mode = normalize_mode(&mode)?;
    let mut config = read_config_from(&config_dir);
    let target = config
        .targets
        .iter_mut()
        .find(|target| target.path == path)
        .ok_or_else(|| ERROR_UNKNOWN_TARGET.to_string())?;
    target.mode = mode;
    write_config_to(&config_dir, &config)
}

// Reclaim one registered target by moving it (or its children) to the system Trash, so every
// cleanup stays reversible — nothing here deletes permanently.
//
// The mode is read from cleanup.toml rather than taken from the caller, and guard_target runs again
// here: this command only ever touches a folder the user deliberately registered and that still
// passes the safety checks. A contents cleanup keeps going past a child it cannot trash and reports
// the failure count, so one locked file doesn't strand the rest.
//
// Async + spawn_blocking: measuring and trashing a multi-gigabyte cache is blocking work.
#[tauri::command]
pub async fn clean_cleanup_target(app: AppHandle, path: String) -> Result<CleanupResult, String> {
    let config_dir = config_dir_of(&app)?;
    let home = app.path().home_dir().ok();

    tauri::async_runtime::spawn_blocking(move || {
        let mode = read_config_from(&config_dir)
            .targets
            .into_iter()
            .find(|target| target.path == path)
            .map(|target| target.mode)
            .ok_or_else(|| ERROR_UNKNOWN_TARGET.to_string())?;

        let resolved = guard_target(&path, &config_dir, home.as_deref())?;

        if mode == MODE_FOLDER {
            let freed = entry_size(&resolved);
            trash_entry_core(&config_dir, &resolved.to_string_lossy())?;
            return Ok(CleanupResult {
                freed,
                removed: 1,
                failed: 0,
                first_error: None,
            });
        }

        let entries = std::fs::read_dir(&resolved).map_err(|e| e.to_string())?;
        let mut result = CleanupResult {
            freed: 0,
            removed: 0,
            failed: 0,
            first_error: None,
        };

        for entry in entries {
            let child = match entry {
                Ok(entry) => entry.path(),
                Err(error) => {
                    result.failed += 1;
                    result.first_error.get_or_insert(error.to_string());
                    continue;
                }
            };
            // Measured before the move: once it's in the Trash the path is gone.
            let size = entry_size(&child);
            match trash_entry_core(&config_dir, &child.to_string_lossy()) {
                Ok(()) => {
                    result.freed += size;
                    result.removed += 1;
                }
                Err(error) => {
                    result.failed += 1;
                    result.first_error.get_or_insert(error);
                }
            }
        }

        Ok(result)
    })
    .await
    .map_err(|error| error.to_string())?
}
