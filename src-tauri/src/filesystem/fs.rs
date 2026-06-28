use serde::Serialize;
use std::collections::hash_map::DefaultHasher;
use std::ffi::OsStr;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::time::SystemTime;
use tauri::{AppHandle, Manager};

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

// Extensions whose thumbnail comes from QuickLook rather than the image decoder (videos and
// PDFs). Matches the previewable video/pdf sets.
const QUICKLOOK_EXTS: &[&str] = &["mp4", "mov", "m4v", "webm", "ogv", "pdf"];

fn needs_quicklook(path: &str) -> bool {
    Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| QUICKLOOK_EXTS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

// Decode the source image used to build a thumbnail: the image file itself, or a frame/page
// rendered by QuickLook for videos and PDFs.
fn thumbnail_source(
    path: &str,
    size: u32,
    tmp_dir: &Path,
) -> Result<image::DynamicImage, String> {
    if needs_quicklook(path) {
        quicklook_thumbnail(path, size, tmp_dir)
    } else {
        image::open(path).map_err(|e| e.to_string())
    }
}

// Render a thumbnail (video frame / PDF first page) via QuickLook (`qlmanage`), which writes
// "<name>.png" into the output dir. macOS-only; other platforms fall back to the generic icon.
#[cfg(target_os = "macos")]
fn quicklook_thumbnail(
    path: &str,
    size: u32,
    tmp_dir: &Path,
) -> Result<image::DynamicImage, String> {
    use std::process::Command;

    fs::create_dir_all(tmp_dir).map_err(|e| e.to_string())?;
    Command::new("qlmanage")
        .args(["-t", "-s", &size.to_string(), "-o"])
        .arg(tmp_dir)
        .arg(path)
        .output()
        .map_err(|e| e.to_string())?;

    let frame = fs::read_dir(tmp_dir)
        .map_err(|e| e.to_string())?
        .flatten()
        .map(|entry| entry.path())
        .find(|p| p.extension().and_then(|e| e.to_str()) == Some("png"))
        .ok_or_else(|| "qlmanage produced no thumbnail".to_string())?;

    let img = image::open(&frame).map_err(|e| e.to_string())?;
    let _ = fs::remove_dir_all(tmp_dir);
    Ok(img)
}

// TODO(windows/linux): render video/PDF thumbnails on non-macOS platforms — e.g. the Windows
// Shell thumbnail API (IShellItemImageFactory) on Windows, or bundling/using ffmpeg + a PDF
// rasterizer elsewhere. Until then these fall back to the generic file icon.
#[cfg(not(target_os = "macos"))]
fn quicklook_thumbnail(
    _path: &str,
    _size: u32,
    _tmp_dir: &Path,
) -> Result<image::DynamicImage, String> {
    Err("QuickLook thumbnails are only supported on macOS".to_string())
}

// Generate (and cache) a downscaled thumbnail for an image file, returning the path to the
// cached thumbnail. The full-resolution decode + resize runs on a worker thread
// (spawn_blocking) so it never blocks the UI thread, and the result is cached on disk keyed
// by source path + mtime + size, so a given file version is processed at most once. The
// frontend loads the tiny thumbnail instead of the multi-megabyte original, which keeps a
// folder full of screenshots from saturating the compositor with huge bitmaps.
#[tauri::command]
pub async fn get_thumbnail(app: AppHandle, path: String, size: u32) -> Result<String, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("thumbnails");

    tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

        let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
        let mtime = metadata
            .modified()
            .ok()
            .and_then(|m| m.duration_since(SystemTime::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);

        let mut hasher = DefaultHasher::new();
        path.hash(&mut hasher);
        mtime.hash(&mut hasher);
        size.hash(&mut hasher);
        let hash = hasher.finish();
        let out = cache_dir.join(format!("{:x}.jpg", hash));

        if out.exists() {
            return Ok(out.to_string_lossy().into_owned());
        }

        // Per-call scratch dir for the video frame extractor (cleaned up inside).
        let tmp_dir = cache_dir.join("video").join(format!("{:x}", hash));
        let img = thumbnail_source(&path, size, &tmp_dir)?;
        // JPEG can't encode alpha, so flatten to RGB. `thumbnail` keeps the aspect ratio and
        // fits within size x size.
        let thumb = image::DynamicImage::ImageRgb8(img.thumbnail(size, size).to_rgb8());
        thumb
            .save_with_format(&out, image::ImageFormat::Jpeg)
            .map_err(|e| e.to_string())?;

        Ok(out.to_string_lossy().into_owned())
    })
    .await
    .map_err(|e| e.to_string())?
}

// Marker returned when a directory cannot be read due to OS privacy/permission protection
// (e.g. macOS TCC guards ~/.Trash). The frontend matches this to prompt for Full Disk Access.
const ACCESS_DENIED: &str = "ACCESS_DENIED";

#[tauri::command]
pub fn read_directory(path: &str) -> Result<Vec<DirEntry>, String> {
    let entries = fs::read_dir(path).map_err(|e| match e.kind() {
        std::io::ErrorKind::PermissionDenied => ACCESS_DENIED.to_string(),
        _ => e.to_string(),
    })?;

    let mut result: Vec<DirEntry> = Vec::new();
    for entry in entries.flatten() {
        if let Ok(dir_entry) = build_dir_entry(entry.path()) {
            result.push(dir_entry);
        }
    }

    Ok(result)
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

// Create a new folder inside `parent`, picking a unique "untitled folder" name. Returns the
// created folder's path so the frontend can start an inline rename on it.
#[tauri::command]
pub fn create_folder(parent: String) -> Result<String, String> {
    let dir = Path::new(&parent);
    let base = "untitled folder";

    let mut candidate = dir.join(base);
    let mut i = 2;
    while candidate.exists() {
        candidate = dir.join(format!("{} {}", base, i));
        i += 1;
    }

    fs::create_dir(&candidate).map_err(|e| e.to_string())?;
    Ok(candidate.to_string_lossy().into_owned())
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
//
// On macOS the `trash` crate defaults to the Finder method (osascript "tell Finder to delete"),
// which requires Automation/Apple Events permission. In an unsigned/dev bundle that prompt can be
// denied or fail, so files never reach ~/.Trash. Force the NsFileManager backend (trashItemAtURL):
// no permission needed, faster, and reliably moves the item to the volume's Trash.
#[tauri::command]
pub fn delete_entry(path: String) -> Result<(), String> {
    println!("[delete_entry] trashing: {}", path);

    #[cfg(target_os = "macos")]
    {
        use trash::macos::{DeleteMethod, TrashContextExtMacos};
        let mut ctx = trash::TrashContext::default();
        ctx.set_delete_method(DeleteMethod::NsFileManager);
        return ctx.delete(&path).map_err(|e| e.to_string());
    }

    #[cfg(not(target_os = "macos"))]
    trash::delete(&path).map_err(|e| e.to_string())
}

// Permanently delete a file or directory, bypassing the Trash (irreversible). Backs the
// Shift+Delete shortcut. Directories are removed recursively.
#[tauri::command]
pub fn delete_entry_permanently(path: String) -> Result<(), String> {
    println!("[delete_entry_permanently] deleting: {}", path);

    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}
