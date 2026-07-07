use std::error::Error;
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Instant, UNIX_EPOCH};

use rusqlite::{params, Connection};
use tauri::{AppHandle, Manager};

use crate::ignore::IgnoreRules;

// Persistent (on-disk) cache of recursive directory sizes. A row per directory holds its
// own_size (direct files) and subtree_size (own + all descendants), enabling incremental
// delta updates without re-walking. Shared via Tauri state.
pub struct SizeIndex(pub Arc<Mutex<Connection>>);

// Bump when the dir_size schema changes. On mismatch the cache table is dropped and
// recreated (it's just a cache — it rebuilds lazily as the user navigates).
const SCHEMA_VERSION: i64 = 2;

pub fn init(app: &AppHandle) -> Result<SizeIndex, Box<dyn Error>> {
    let dir = app.path().app_data_dir()?;
    fs::create_dir_all(&dir)?;

    let conn = Connection::open(dir.join("size_index.db"))?;

    let version: i64 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    if version != SCHEMA_VERSION {
        crate::dlog!("schema {} -> {}, rebuilding cache", version, SCHEMA_VERSION);
        conn.execute("DROP TABLE IF EXISTS dir_size", [])?;
    }
    crate::dlog!("db ready at {}", dir.join("size_index.db").display());

    conn.execute(
        "CREATE TABLE IF NOT EXISTS dir_size (
            path         TEXT PRIMARY KEY,
            parent       TEXT,
            own_size     INTEGER NOT NULL,
            subtree_size INTEGER NOT NULL,
            mtime        INTEGER NOT NULL
        )",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_dir_size_parent ON dir_size(parent)",
        [],
    )?;
    conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;

    Ok(SizeIndex(Arc::new(Mutex::new(conn))))
}

fn mtime_of(path: &Path) -> i64 {
    fs::metadata(path)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

fn upsert(conn: &Connection, path: &Path, own: u64, subtree: u64) {
    let parent = path.parent().map(|p| p.to_string_lossy().into_owned());
    let _ = conn.execute(
        "INSERT INTO dir_size (path, parent, own_size, subtree_size, mtime)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(path) DO UPDATE SET
            parent = ?2, own_size = ?3, subtree_size = ?4, mtime = ?5",
        params![
            path.to_string_lossy(),
            parent,
            own as i64,
            subtree as i64,
            mtime_of(path)
        ],
    );
}

fn cached_subtree(conn: &Connection, path: &str) -> Option<(u64, i64)> {
    conn.query_row(
        "SELECT subtree_size, mtime FROM dir_size WHERE path = ?1",
        params![path],
        |row| Ok((row.get::<_, i64>(0)? as u64, row.get::<_, i64>(1)?)),
    )
    .ok()
}

fn cached_own_mtime(conn: &Connection, path: &str) -> Option<(u64, i64)> {
    conn.query_row(
        "SELECT own_size, mtime FROM dir_size WHERE path = ?1",
        params![path],
        |row| Ok((row.get::<_, i64>(0)? as u64, row.get::<_, i64>(1)?)),
    )
    .ok()
}

fn delete_subtree(conn: &Connection, path: &str) {
    let _ = conn.execute(
        "DELETE FROM dir_size WHERE path = ?1 OR path LIKE ?2",
        params![path, format!("{}/%", path)],
    );
}

// Recursively index `path` and every descendant directory (bottom-up), writing a row for
// each. Returns the subtree size. Symlinks and ignored paths are skipped.
fn index_subtree(conn: &Connection, path: &Path, ignores: &IgnoreRules) -> u64 {
    let mut own: u64 = 0;
    let mut subtree: u64 = 0;

    if let Ok(read) = fs::read_dir(path) {
        for entry in read.flatten() {
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };
            if file_type.is_symlink() {
                continue;
            }
            let child = entry.path();
            if ignores.is_ignored(&child) {
                continue;
            }
            if file_type.is_dir() {
                subtree += index_subtree(conn, &child, ignores);
            } else if file_type.is_file() {
                if let Ok(meta) = entry.metadata() {
                    own += meta.len();
                }
            }
        }
    }

    subtree += own;
    upsert(conn, path, own, subtree);
    subtree
}

// Recursive directory size, served from the cache when the directory's own mtime is unchanged;
// otherwise (re)indexed bottom-up and cached. Synchronous — the caller (the get_dir_size Tauri
// command) runs it inside spawn_blocking, and routes remote/SFTP paths elsewhere.
pub fn cached_size(
    index: &Arc<Mutex<Connection>>,
    path: &str,
    ignores: &IgnoreRules,
) -> Result<u64, String> {
    let mtime = mtime_of(Path::new(path));
    let mut conn = index.lock().map_err(|e| e.to_string())?;

    if let Some((subtree, cached_mtime)) = cached_subtree(&conn, path) {
        if cached_mtime == mtime {
            crate::dlog!("cache hit  {} = {} bytes", path, subtree);
            return Ok(subtree);
        }
    }

    let started = Instant::now();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    // Reconcile: drop the cached subtree first so descendants that vanished since the last walk
    // don't linger as orphan rows. Then re-index from scratch.
    delete_subtree(&tx, path);
    let size = index_subtree(&tx, Path::new(path), ignores);
    tx.commit().map_err(|e| e.to_string())?;
    crate::dlog!(
        "indexed    {} = {} bytes in {:?}",
        path,
        size,
        started.elapsed()
    );
    Ok(size)
}

// --- Incremental update helpers (used by the FSEvents watcher in Phase B) -------------------

// Re-sync one directory shallowly: recompute own_size from its direct files and subtree_size
// from its (cached) child directories — indexing any newly-created child and pruning deleted
// ones. Returns the subtree-size delta to bubble to ancestors, or None if it didn't change /
// the directory is gone.
pub fn resync_dir(conn: &Connection, path: &Path, ignores: &IgnoreRules) -> Option<i64> {
    let path_str = path.to_string_lossy().into_owned();

    if !path.is_dir() {
        let old = cached_subtree(conn, &path_str)
            .map(|(s, _)| s as i64)
            .unwrap_or(0);
        delete_subtree(conn, &path_str);
        if old != 0 {
            crate::dlog!("removed    {} (Δ {})", path_str, -old);
            return Some(-old);
        }
        return None;
    }

    let old = cached_subtree(conn, &path_str)
        .map(|(s, _)| s as i64)
        .unwrap_or(0);

    let mut own: u64 = 0;
    let mut subtree: u64 = 0;
    let mut seen: Vec<String> = Vec::new();

    if let Ok(read) = fs::read_dir(path) {
        for entry in read.flatten() {
            let file_type = match entry.file_type() {
                Ok(ft) => ft,
                Err(_) => continue,
            };
            if file_type.is_symlink() {
                continue;
            }
            let child = entry.path();
            if ignores.is_ignored(&child) {
                continue;
            }
            if file_type.is_dir() {
                let child_str = child.to_string_lossy().into_owned();
                let child_subtree = match cached_subtree(conn, &child_str) {
                    Some((s, _)) => s,
                    None => index_subtree(conn, &child, ignores),
                };
                subtree += child_subtree;
                seen.push(child_str);
            } else if file_type.is_file() {
                if let Ok(meta) = entry.metadata() {
                    own += meta.len();
                }
            }
        }
    }
    subtree += own;

    // Prune cached child directories that no longer exist on disk.
    if let Ok(mut stmt) = conn.prepare("SELECT path FROM dir_size WHERE parent = ?1") {
        let cached_children: Vec<String> = stmt
            .query_map(params![path_str], |r| r.get::<_, String>(0))
            .map(|rows| rows.flatten().collect())
            .unwrap_or_default();
        for child in cached_children {
            if !seen.contains(&child) {
                delete_subtree(conn, &child);
            }
        }
    }

    upsert(conn, path, own, subtree);

    let delta = subtree as i64 - old;
    if delta != 0 {
        crate::dlog!(
            "resync     {} {} -> {} (Δ {})",
            path_str,
            old,
            subtree,
            delta
        );
        Some(delta)
    } else {
        None
    }
}

// Add `delta` to the subtree_size of every cached ancestor of `from`, up to and including `root`.
pub fn bubble(conn: &Connection, from: &Path, root: &Path, delta: i64) {
    let mut current = from.parent();
    while let Some(dir) = current {
        let _ = conn.execute(
            "UPDATE dir_size SET subtree_size = subtree_size + ?1 WHERE path = ?2",
            params![delta, dir.to_string_lossy()],
        );
        if dir == root {
            break;
        }
        current = dir.parent();
    }
}

pub fn subtree_of(conn: &Connection, path: &str) -> Option<u64> {
    cached_subtree(conn, path).map(|(s, _)| s)
}

// Wipe every cached size row. Called when the ignore rules change: cached subtree sizes were
// computed under the old rules, and since they're keyed on mtime (which doesn't change when only
// the rules do) they'd otherwise be served stale. The cache is lazy, so it refills as folders are
// revisited/walked.
pub fn clear(index: &Arc<Mutex<Connection>>) {
    if let Ok(conn) = index.lock() {
        let _ = conn.execute("DELETE FROM dir_size", []);
        crate::dlog!("cache cleared (ignore rules changed)");
    }
}

// Process this many cached dirs per locked transaction, releasing the mutex between chunks
// so live get_dir_size calls can interleave during the startup reconcile.
const RECONCILE_CHUNK: usize = 500;

// Bring the cache back in sync with disk after the app was closed (the watcher only runs while
// open). Cached directories are processed deepest-first: vanished ones are pruned, and subtree
// sizes are recomputed — so even deep offline changes (which don't touch an ancestor's mtime)
// propagate correctly. Meant to run in the background at startup.
pub fn reconcile(index: Arc<Mutex<Connection>>, ignores: IgnoreRules) {
    let paths: Vec<String> = {
        let conn = match index.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        let mut stmt = match conn.prepare(
            "SELECT path FROM dir_size
             ORDER BY (length(path) - length(replace(path, '/', ''))) DESC",
        ) {
            Ok(s) => s,
            Err(_) => return,
        };
        let collected = match stmt.query_map([], |r| r.get::<_, String>(0)) {
            Ok(rows) => rows.flatten().collect(),
            Err(_) => return,
        };
        collected
    };

    crate::dlog!("reconcile  start ({} dirs)", paths.len());
    let mut pruned = 0u64;
    let mut changed = 0u64;

    for chunk in paths.chunks(RECONCILE_CHUNK) {
        let mut conn = match index.lock() {
            Ok(c) => c,
            Err(_) => return,
        };
        let tx = match conn.transaction() {
            Ok(t) => t,
            Err(_) => continue,
        };

        for path in chunk {
            let p = Path::new(path);
            if ignores.is_ignored(p) {
                continue;
            }
            if !p.is_dir() {
                delete_subtree(&tx, path);
                pruned += 1;
                continue;
            }

            let (own_cached, mtime_cached) = match cached_own_mtime(&tx, path) {
                Some(v) => v,
                None => continue,
            };

            if mtime_of(p) != mtime_cached {
                // Direct contents changed: refresh own + children, prune/add, write subtree.
                if resync_dir(&tx, p, &ignores).is_some() {
                    changed += 1;
                }
            } else {
                // Unchanged here, but a deeper descendant may have changed — re-sum children.
                let children: i64 = tx
                    .query_row(
                        "SELECT COALESCE(SUM(subtree_size), 0) FROM dir_size WHERE parent = ?1",
                        params![path],
                        |r| r.get(0),
                    )
                    .unwrap_or(0);
                let subtree = own_cached as i64 + children;
                let _ = tx.execute(
                    "UPDATE dir_size SET subtree_size = ?1 WHERE path = ?2 AND subtree_size <> ?1",
                    params![subtree, path],
                );
            }
        }

        let _ = tx.commit();
    }

    crate::dlog!("reconcile  done ({} changed, {} pruned)", changed, pruned);
}
