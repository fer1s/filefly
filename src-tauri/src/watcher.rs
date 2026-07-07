use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, RwLock};

use notify::{RecommendedWatcher, RecursiveMode, Watcher};
use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};

use crate::ignore::{IgnoreList, IgnoreRules};
use crate::index::{self, SizeIndex};

#[derive(Clone, Serialize)]
struct SizeChanged {
    path: String,
    size: u64,
}

// Holds the active recursive watcher and the directory it watches (the current view).
pub struct DirWatcher {
    inner: Mutex<WatcherState>,
}

struct WatcherState {
    watcher: Option<RecommendedWatcher>,
    root: Option<PathBuf>,
}

impl DirWatcher {
    pub fn new() -> Self {
        DirWatcher {
            inner: Mutex::new(WatcherState {
                watcher: None,
                root: None,
            }),
        }
    }
}

impl Default for DirWatcher {
    fn default() -> Self {
        Self::new()
    }
}

// The directory that "owns" a changed path: the path itself if it's still a directory,
// otherwise its parent.
fn nearest_dir(path: &Path) -> PathBuf {
    if path.is_dir() {
        path.to_path_buf()
    } else {
        path.parent()
            .map(Path::to_path_buf)
            .unwrap_or_else(|| path.to_path_buf())
    }
}

// The direct child of `root` that contains `path` (the folder in the current view whose size
// changed), or None if `path` isn't strictly under `root`.
fn child_of_root(root: &Path, path: &Path) -> Option<PathBuf> {
    let rel = path.strip_prefix(root).ok()?;
    let first = rel.components().next()?;
    Some(root.join(first.as_os_str()))
}

fn handle_event(
    app: &AppHandle,
    index: &Arc<Mutex<Connection>>,
    ignores: &Arc<RwLock<IgnoreRules>>,
    root: &Path,
    paths: &[PathBuf],
) {
    let ignore_list = ignores.read().map(|r| r.clone()).unwrap_or_default();

    // Drop events for ignored paths (e.g. our own DB writes) before doing anything.
    let relevant: Vec<&PathBuf> = paths
        .iter()
        .filter(|p| !ignore_list.is_ignored(p))
        .collect();
    if relevant.is_empty() {
        return;
    }

    crate::dlog!("fs event   {:?}", relevant);

    let conn = match index.lock() {
        Ok(c) => c,
        Err(_) => return,
    };

    let mut affected: HashSet<PathBuf> = HashSet::new();

    for path in relevant {
        if path != root && path.strip_prefix(root).is_err() {
            continue; // outside the watched tree
        }

        let container = nearest_dir(path);
        if let Some(delta) = index::resync_dir(&conn, &container, &ignore_list) {
            index::bubble(&conn, &container, root, delta);
        }

        if let Some(child) = child_of_root(root, &container) {
            if &child != root {
                affected.insert(child);
            }
        }
    }

    for child in affected {
        if let Some(size) = index::subtree_of(&conn, &child.to_string_lossy()) {
            crate::dlog!("emit       {} = {} bytes", child.display(), size);
            let _ = app.emit(
                "dir-size-changed",
                SizeChanged {
                    path: child.to_string_lossy().into_owned(),
                    size,
                },
            );
        }
    }
}

// Watch `path` recursively for changes, replacing any previous watch. Called by the frontend
// whenever the viewed directory changes. Changes bubble into the size cache and emit
// `dir-size-changed` so the open view updates live.
#[tauri::command]
pub fn watch_directory(
    path: String,
    app: AppHandle,
    watcher: State<'_, DirWatcher>,
    index: State<'_, SizeIndex>,
    ignore: State<'_, IgnoreList>,
) -> Result<(), String> {
    let mut state = watcher.inner.lock().map_err(|e| e.to_string())?;

    let root = PathBuf::from(&path);
    if !root.is_dir() {
        state.watcher = None; // drops & stops the previous watcher
        state.root = None;
        return Ok(());
    }

    let app_handle = app.clone();
    let conn = index.0.clone();
    let ignores = ignore.0.clone();
    let cb_root = root.clone();

    let mut new_watcher = notify::recommended_watcher(move |res: notify::Result<notify::Event>| {
        if let Ok(event) = res {
            handle_event(&app_handle, &conn, &ignores, &cb_root, &event.paths);
        }
    })
    .map_err(|e| e.to_string())?;

    new_watcher
        .watch(&root, RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    crate::dlog!("watching   {}", root.display());

    state.watcher = Some(new_watcher); // drops the previous watcher
    state.root = Some(root);
    Ok(())
}
