use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

// Path prefixes excluded from indexing and watching. Seeded with the app's own data dir so
// our SQLite writes never trigger watcher feedback (write -> fs event -> resync -> write...).
// Built around an RwLock so user-defined excludes can be added at runtime later.
pub struct IgnoreList(pub Arc<RwLock<Vec<PathBuf>>>);

impl IgnoreList {
    pub fn new(initial: Vec<PathBuf>) -> Self {
        IgnoreList(Arc::new(RwLock::new(initial)))
    }

    pub fn snapshot(&self) -> Vec<PathBuf> {
        self.0.read().map(|v| v.clone()).unwrap_or_default()
    }
}

// True if `path` is, or lives under, any ignored prefix.
pub fn is_ignored(path: &Path, ignores: &[PathBuf]) -> bool {
    ignores
        .iter()
        .any(|prefix| path == prefix || path.starts_with(prefix))
}
