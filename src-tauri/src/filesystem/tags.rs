use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::fs::DirEntry;

// A Finder tag: a name plus a color index (0 = no colour, 1..=7 = the standard Finder colours:
// gray, green, purple, blue, yellow, red, orange).
#[derive(Debug, Serialize, Deserialize)]
pub struct Tag {
    name: String,
    color: u8,
}

// macOS stores Finder tags in the extended attribute `com.apple.metadata:_kMDItemUserTags`, a
// binary plist holding an array of strings, each `"Name\nColorIndex"` (the colour part is absent
// for an uncoloured tag). We read the real attribute so tags stay in sync with Finder.
#[cfg(target_os = "macos")]
mod imp {
    use std::io::Cursor;
    use std::path::PathBuf;

    use super::super::fs::{build_dir_entry, DirEntry};
    use super::Tag;

    const TAGS_ATTR: &str = "com.apple.metadata:_kMDItemUserTags";

    pub fn read(path: &str) -> Vec<Tag> {
        let raw = match xattr::get(path, TAGS_ATTR) {
            Ok(Some(bytes)) => bytes,
            // No attribute (untagged) or unreadable → no tags.
            _ => return Vec::new(),
        };

        let value = match plist::Value::from_reader(Cursor::new(&raw[..])) {
            Ok(v) => v,
            Err(_) => return Vec::new(),
        };

        let Some(array) = value.as_array() else {
            return Vec::new();
        };

        array
            .iter()
            .filter_map(|entry| entry.as_string())
            .map(|raw_tag| {
                let mut parts = raw_tag.splitn(2, '\n');
                let name = parts.next().unwrap_or_default().to_string();
                let color = parts
                    .next()
                    .and_then(|c| c.trim().parse::<u8>().ok())
                    .unwrap_or(0);
                Tag { name, color }
            })
            .collect()
    }

    pub fn write(path: &str, tags: &[Tag]) -> Result<(), String> {
        // No tags → remove the attribute entirely (Finder's "untagged" state), not an empty array.
        if tags.is_empty() {
            return match xattr::remove(path, TAGS_ATTR) {
                Ok(()) => Ok(()),
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
                Err(e) => Err(e.to_string()),
            };
        }

        // Serialize back to the Finder format: array of "Name\nColorIndex" (colour omitted at 0).
        let array = plist::Value::Array(
            tags.iter()
                .map(|tag| {
                    let encoded = if tag.color == 0 {
                        tag.name.clone()
                    } else {
                        format!("{}\n{}", tag.name, tag.color)
                    };
                    plist::Value::String(encoded)
                })
                .collect(),
        );

        let mut buffer = Vec::new();
        array
            .to_writer_binary(&mut buffer)
            .map_err(|e| e.to_string())?;
        xattr::set(path, TAGS_ATTR, &buffer).map_err(|e| e.to_string())
    }

    // Files carrying a given tag, via Spotlight (scoped to $HOME, like recents). Empty when
    // Spotlight hasn't indexed the location or finds nothing.
    pub fn find(tag: &str) -> Vec<DirEntry> {
        let Ok(home) = std::env::var("HOME") else {
            return Vec::new();
        };
        // Strip quotes so the tag can't break out of the mdfind query literal.
        let query = format!("kMDItemUserTags == '{}'cd", tag.replace('\'', ""));
        let output = match std::process::Command::new("mdfind")
            .arg("-onlyin")
            .arg(&home)
            .arg(&query)
            .output()
        {
            Ok(output) => output,
            Err(_) => return Vec::new(),
        };

        String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter(|line| !line.is_empty())
            .filter_map(|line| build_dir_entry(PathBuf::from(line)).ok())
            .collect()
    }
}

// TODO(win/linux): there is no native Finder-tags equivalent. A sidecar tag store could live here,
// but only once it can actually be tested on those platforms — until then tags are simply absent.
#[cfg(not(target_os = "macos"))]
mod imp {
    use super::Tag;

    pub fn read(_path: &str) -> Vec<Tag> {
        Vec::new()
    }

    pub fn write(_path: &str, _tags: &[Tag]) -> Result<(), String> {
        Ok(())
    }

    pub fn find(_tag: &str) -> Vec<super::DirEntry> {
        Vec::new()
    }
}

// Tags for a batch of paths, keyed by path. Lazy by design — the UI requests only the rows it is
// showing — so reading the per-file xattr never touches the `read_directory` hot path. Runs on a
// blocking thread (xattr reads are syscalls).
#[tauri::command]
pub async fn get_tags_for(
    paths: Vec<String>,
) -> Result<HashMap<String, Vec<Tag>>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        paths
            .into_iter()
            .map(|path| {
                let tags = imp::read(&path);
                (path, tags)
            })
            .collect()
    })
    .await
    .map_err(|e| e.to_string())
}

// Replace a file's tags (macOS only; a no-op elsewhere). Passing an empty list clears them.
#[tauri::command]
pub async fn set_file_tags(path: String, tags: Vec<Tag>) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || imp::write(&path, &tags))
        .await
        .map_err(|e| e.to_string())?
}

// Files carrying the given tag (macOS only; empty elsewhere), for the sidebar tag filter.
#[tauri::command]
pub async fn find_tagged(tag: String) -> Result<Vec<DirEntry>, String> {
    tauri::async_runtime::spawn_blocking(move || imp::find(&tag))
        .await
        .map_err(|e| e.to_string())
}
