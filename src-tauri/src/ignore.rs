use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

// A snapshot of the rules that exclude entries from size indexing and watching. Two kinds:
//   * prefixes  — absolute path prefixes excluded wholesale. Internal, set once at startup and
//     seeded with the app's own data dir so our SQLite writes never feed the watcher back into
//     itself (write -> fs event -> resync -> write ...).
//   * name_globs — user-defined glob patterns matched against an entry's file NAME anywhere in the
//     tree (e.g. ".DS_Store", "*.tmp", "node_modules"), so junk files/folders don't inflate sizes.
//     Editable at runtime from the settings dialog.
#[derive(Clone, Default)]
pub struct IgnoreRules {
    pub prefixes: Vec<PathBuf>,
    pub name_globs: Vec<String>,
}

impl IgnoreRules {
    // True if `path` is (or lives under) an ignored prefix, or its file name matches a name-glob.
    pub fn is_ignored(&self, path: &Path) -> bool {
        if self
            .prefixes
            .iter()
            .any(|prefix| path == prefix || path.starts_with(prefix))
        {
            return true;
        }
        match path.file_name().and_then(|n| n.to_str()) {
            Some(name) => self.name_globs.iter().any(|pat| glob_match(pat, name)),
            None => false,
        }
    }
}

// Shared, runtime-mutable ignore rules. Prefixes are fixed at startup; name globs come from user
// settings and can be replaced live (settings dialog) via `set_globs`. Built around an RwLock so
// reads (every indexed entry) don't contend with the occasional settings write.
pub struct IgnoreList(pub Arc<RwLock<IgnoreRules>>);

impl IgnoreList {
    pub fn new(prefixes: Vec<PathBuf>, name_globs: Vec<String>) -> Self {
        IgnoreList(Arc::new(RwLock::new(IgnoreRules {
            prefixes,
            name_globs,
        })))
    }

    pub fn snapshot(&self) -> IgnoreRules {
        self.0.read().map(|r| r.clone()).unwrap_or_default()
    }

    // Replace just the user name-globs, keeping the internal prefixes intact.
    pub fn set_globs(&self, name_globs: Vec<String>) {
        if let Ok(mut rules) = self.0.write() {
            rules.name_globs = name_globs;
        }
    }
}

// Minimal glob matcher supporting `*` (any run of chars, including empty) and `?` (exactly one
// char); everything else is a literal. Case-sensitive, no `[...]` classes or path separators — it
// matches a single file/dir name, which is all the size-ignore patterns need. Empty patterns never
// match (so a blank input row is a no-op). Classic two-pointer wildcard match with backtracking.
fn glob_match(pattern: &str, name: &str) -> bool {
    if pattern.is_empty() {
        return false;
    }
    let p: Vec<char> = pattern.chars().collect();
    let s: Vec<char> = name.chars().collect();
    let (mut pi, mut si) = (0usize, 0usize);
    let mut star: Option<usize> = None;
    let mut star_si = 0usize;

    while si < s.len() {
        if pi < p.len() && (p[pi] == '?' || p[pi] == s[si]) {
            pi += 1;
            si += 1;
        } else if pi < p.len() && p[pi] == '*' {
            star = Some(pi);
            star_si = si;
            pi += 1;
        } else if let Some(sp) = star {
            // Mismatch after a `*` — extend the `*` to swallow one more char and retry.
            pi = sp + 1;
            star_si += 1;
            si = star_si;
        } else {
            return false;
        }
    }
    while pi < p.len() && p[pi] == '*' {
        pi += 1;
    }
    pi == p.len()
}

#[cfg(test)]
mod tests {
    use super::glob_match;

    #[test]
    fn literals_and_wildcards() {
        assert!(glob_match(".DS_Store", ".DS_Store"));
        assert!(!glob_match(".DS_Store", ".ds_store")); // case-sensitive
        assert!(glob_match("*.tmp", "scratch.tmp"));
        assert!(glob_match("*.tmp", ".tmp"));
        assert!(!glob_match("*.tmp", "tmp.txt"));
        assert!(glob_match("node_modules", "node_modules"));
        assert!(glob_match("cache?", "cache1"));
        assert!(!glob_match("cache?", "cache")); // ? needs one char
        assert!(glob_match("*", "anything"));
        assert!(!glob_match("", "anything")); // empty pattern is a no-op
    }
}
