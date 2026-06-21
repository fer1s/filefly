use serde::Serialize;
use std::ffi::OsStr;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirMetadata {
    is_dir: bool,
    is_file: bool,
    modified: SystemTime,
    accessed: SystemTime,
    created: SystemTime,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    name: String,
    path: PathBuf,
    size: u64,
    metadata: DirMetadata,
}

fn build_dir_entry(path: PathBuf) -> Result<DirEntry, String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    let accessed = metadata.accessed().unwrap_or(SystemTime::UNIX_EPOCH);
    let created = metadata.created().unwrap_or(modified);
    let name = path
        .file_name()
        .unwrap_or(path.as_os_str())
        .to_string_lossy()
        .into_owned();

    Ok(DirEntry {
        name,
        path,
        size: metadata.len(),
        metadata: DirMetadata {
            is_dir: metadata.is_dir(),
            is_file: metadata.is_file(),
            modified,
            accessed,
            created,
        },
    })
}

#[tauri::command]
pub fn get_entry(path: String) -> Result<DirEntry, String> {
    build_dir_entry(PathBuf::from(path))
}

// Recursively sum the apparent size (bytes) of every file under `path`. Used to fill the
// size column for directories, which the OS reports as 0. Symlinks are not followed (jwalk
// default), matching `du` without -L.
//
// The command is `async` and the walk runs on `spawn_blocking`: Tauri executes synchronous
// commands on the main thread, so a plain sync version froze the UI for the whole walk.
// This keeps the webview responsive while the (CPU/IO-bound) walk runs on a worker thread.
#[tauri::command]
pub async fn get_dir_size(path: String) -> u64 {
    tauri::async_runtime::spawn_blocking(move || {
        jwalk::WalkDir::new(path)
            .skip_hidden(false)
            .into_iter()
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_type().is_file())
            .filter_map(|entry| entry.metadata().ok())
            .map(|metadata| metadata.len())
            .sum()
    })
    .await
    .unwrap_or(0)
}

#[tauri::command]
pub fn read_directory(path: &str) -> Vec<DirEntry> {
    let mut result: Vec<DirEntry> = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries {
            if let Ok(entry) = entry {
                if let Ok(dir_entry) = build_dir_entry(entry.path()) {
                    result.push(dir_entry);
                }
            }
        }
    };

    result
}

// Open a file with the OS default application. Logs the path to the Tauri terminal (stdout)
// and returns the error to the frontend instead of failing silently.
#[tauri::command]
pub fn open_file(path: String) -> Result<(), String> {
    println!("[open_file] opening: {}", path);

    tauri_plugin_opener::open_path(path, None::<&str>).map_err(|e| {
        eprintln!("[open_file] error: {}", e);
        e.to_string()
    })
}

// Pick a destination path inside `dir` for `name`, avoiding collisions by appending " copy".
fn unique_dest(dir: &Path, name: &OsStr) -> PathBuf {
    let candidate = dir.join(name);
    if !candidate.exists() {
        return candidate;
    }

    let name_str = name.to_string_lossy();
    let (stem, ext) = match name_str.rsplit_once('.') {
        Some((s, e)) => (s.to_string(), format!(".{}", e)),
        None => (name_str.to_string(), String::new()),
    };

    let mut i = 1;
    loop {
        let attempt = if i == 1 {
            format!("{} copy{}", stem, ext)
        } else {
            format!("{} copy {}{}", stem, i, ext)
        };
        let candidate = dir.join(attempt);
        if !candidate.exists() {
            return candidate;
        }
        i += 1;
    }
}

fn copy_dir_recursive(src: &Path, dest: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dest)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let target = dest.join(entry.file_name());
        if path.is_dir() {
            copy_dir_recursive(&path, &target)?;
        } else {
            fs::copy(&path, &target)?;
        }
    }
    Ok(())
}

// Copy a file or directory into dest_dir (recursively for dirs), avoiding name collisions.
#[tauri::command]
pub fn copy_entry(source: String, dest_dir: String) -> Result<(), String> {
    let src = Path::new(&source);
    let name = src.file_name().ok_or_else(|| "Invalid source path".to_string())?;
    let dest = unique_dest(Path::new(&dest_dir), name);

    let result = if src.is_dir() {
        copy_dir_recursive(src, &dest)
    } else {
        fs::copy(src, &dest).map(|_| ())
    };
    result.map_err(|e| e.to_string())
}

// Move a file or directory into dest_dir. Fast rename when possible, copy + delete across volumes.
#[tauri::command]
pub fn move_entry(source: String, dest_dir: String) -> Result<(), String> {
    let src = Path::new(&source);
    let name = src.file_name().ok_or_else(|| "Invalid source path".to_string())?;
    let dest = unique_dest(Path::new(&dest_dir), name);

    if fs::rename(src, &dest).is_ok() {
        return Ok(());
    }

    if src.is_dir() {
        copy_dir_recursive(src, &dest).map_err(|e| e.to_string())?;
        fs::remove_dir_all(src).map_err(|e| e.to_string())
    } else {
        fs::copy(src, &dest).map_err(|e| e.to_string())?;
        fs::remove_file(src).map_err(|e| e.to_string())
    }
}

// Rename an entry in place within its parent directory.
#[tauri::command]
pub fn rename_entry(path: String, new_name: String) -> Result<(), String> {
    let p = Path::new(&path);
    let parent = p.parent().ok_or_else(|| "No parent directory".to_string())?;
    let dest = parent.join(&new_name);

    if dest.exists() {
        return Err("An item with that name already exists".to_string());
    }
    fs::rename(p, dest).map_err(|e| e.to_string())
}

// Move an entry to the system Trash/Recycle Bin (reversible).
#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    println!("[delete_entry] trashing: {}", path);
    trash::delete(&path).map_err(|e| e.to_string())
}
