use ab_glyph::{FontVec, PxScale};
use imageproc::drawing::draw_text_mut;
use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::ffi::OsStr;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::Read;
#[cfg(unix)]
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::SystemTime;
use tauri::ipc::Channel;
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
    // Actual space the file occupies on disk (allocated blocks), which differs from `size` due
    // to filesystem block rounding / sparse files.
    size_on_disk: u64,
    metadata: DirMetadata,
}

pub(crate) fn build_dir_entry(path: PathBuf) -> Result<DirEntry, String> {
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    let modified = metadata.modified().unwrap_or(SystemTime::UNIX_EPOCH);
    let accessed = metadata.accessed().unwrap_or(SystemTime::UNIX_EPOCH);
    let created = metadata.created().unwrap_or(modified);
    let name = path
        .file_name()
        .unwrap_or(path.as_os_str())
        .to_string_lossy()
        .into_owned();

    // On Unix, blocks are 512 bytes each. No portable equivalent on Windows, so fall back to
    // the apparent size there.
    #[cfg(unix)]
    let size_on_disk = metadata.blocks() * 512;
    #[cfg(not(unix))]
    let size_on_disk = metadata.len();

    Ok(DirEntry {
        name,
        path,
        size: metadata.len(),
        size_on_disk,
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

// Cap recursive search results so a query like "a" near the home dir can't return a million rows.
const SEARCH_RESULT_LIMIT: usize = 1000;

// Recursively search under `path` for entries whose name contains `query` (case-insensitive),
// returning up to SEARCH_RESULT_LIMIT matches. Async + spawn_blocking so the (IO-bound) walk runs
// off the main thread and keeps the UI responsive; symlinks aren't followed (jwalk default).
#[tauri::command]
pub async fn search_directory(
    path: String,
    query: String,
) -> Result<Vec<DirEntry>, String> {
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(Vec::new());
    }

    tauri::async_runtime::spawn_blocking(move || {
        let root = Path::new(&path);
        let mut results: Vec<DirEntry> = Vec::new();

        for entry in jwalk::WalkDir::new(&path)
            .skip_hidden(false)
            .into_iter()
            .filter_map(|entry| entry.ok())
        {
            let entry_path = entry.path();
            if entry_path == root {
                continue; // the folder being searched isn't a result
            }
            let matches = entry_path
                .file_name()
                .map(|name| name.to_string_lossy().to_lowercase().contains(&needle))
                .unwrap_or(false);
            if matches {
                if let Ok(found) = build_dir_entry(entry_path) {
                    results.push(found);
                    if results.len() >= SEARCH_RESULT_LIMIT {
                        break;
                    }
                }
            }
        }

        results
    })
    .await
    .map_err(|error| error.to_string())
}

// Extensions whose thumbnail comes from QuickLook rather than the image decoder (videos and
// PDFs). Matches the previewable video/pdf sets. (Markdown is handled by text_thumbnail instead:
// QuickLook has no good markdown thumbnailer and stalls the queue — see TEXT_EXTS.)
const QUICKLOOK_EXTS: &[&str] = &["mp4", "mov", "m4v", "webm", "ogv", "pdf"];

fn needs_quicklook(path: &str) -> bool {
    has_ext(path, QUICKLOOK_EXTS)
}

// Extensions rendered as a text-document thumbnail (first lines drawn onto a card). Fast and
// in-process, unlike QuickLook. Generic enough to extend to other text/code types later.
const TEXT_EXTS: &[&str] = &["md", "markdown"];

fn is_text(path: &str) -> bool {
    has_ext(path, TEXT_EXTS)
}

fn has_ext(path: &str, exts: &[&str]) -> bool {
    Path::new(path)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| exts.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

// Decode the source image used to build a thumbnail: a text-document render for markdown, a
// frame/page rendered by QuickLook for videos and PDFs, or the image file itself.
fn thumbnail_source(
    path: &str,
    size: u32,
    tmp_dir: &Path,
) -> Result<image::DynamicImage, String> {
    if is_text(path) {
        text_thumbnail(path)
    } else if needs_quicklook(path) {
        quicklook_thumbnail(path, size, tmp_dir)
    } else {
        image::open(path).map_err(|e| e.to_string())
    }
}

// A font for text-document thumbnails, loaded once from a system font (macOS ships these). None
// if none can be read — the caller then falls back to the generic icon.
fn text_font() -> Option<&'static FontVec> {
    static TEXT_FONT: OnceLock<Option<FontVec>> = OnceLock::new();
    TEXT_FONT
        .get_or_init(|| {
            const CANDIDATES: &[&str] = &[
                "/System/Library/Fonts/Supplemental/Arial.ttf",
                "/System/Library/Fonts/Supplemental/Verdana.ttf",
                "/System/Library/Fonts/Supplemental/Courier New.ttf",
                "/Library/Fonts/Arial.ttf",
            ];
            CANDIDATES
                .iter()
                .filter_map(|path| std::fs::read(path).ok())
                .find_map(|bytes| FontVec::try_from_vec(bytes).ok())
        })
        .as_ref()
}

// Build a "document card" thumbnail for a text file: the first lines drawn as dark text on a
// light page. Reads only a prefix of the file and runs in-process — no subprocess, fast, and
// can't stall the thumbnail queue the way QuickLook does.
fn text_thumbnail(path: &str) -> Result<image::DynamicImage, String> {
    let font = text_font().ok_or_else(|| "No system font for text thumbnail".to_string())?;

    // Only the start of the file is needed for the preview; avoid reading large files whole.
    let mut buf = Vec::new();
    fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take(8192)
        .read_to_end(&mut buf)
        .map_err(|e| e.to_string())?;
    let text = String::from_utf8_lossy(&buf);

    const W: u32 = 512;
    const H: u32 = 512;
    const PADDING: i32 = 32;
    const LINE_HEIGHT: i32 = 26;
    const MAX_LINES: usize = 17;
    const MAX_CHARS: usize = 46;
    const FONT_PX: f32 = 21.0;

    let mut canvas = image::RgbaImage::from_pixel(W, H, image::Rgba([245, 245, 247, 255]));
    let color = image::Rgba([45, 45, 48, 255]);
    let scale = PxScale::from(FONT_PX);

    for (i, line) in text.lines().take(MAX_LINES).enumerate() {
        let truncated: String = line.replace('\t', "    ").chars().take(MAX_CHARS).collect();
        let y = PADDING + i as i32 * LINE_HEIGHT;
        draw_text_mut(&mut canvas, color, PADDING, y, scale, font, &truncated);
    }

    Ok(image::DynamicImage::ImageRgba8(canvas))
}

// Render a thumbnail (video frame / PDF first page) via QuickLook (`qlmanage`), which writes
// "<name>.png" into the output dir. macOS-only; other platforms fall back to the generic icon.
//
// TODO: each call spawns the `qlmanage` process, which macOS briefly registers as a launching
// app — so scrolling a folder full of (uncached) videos/PDFs makes the Dock divider jump. It's
// only the first pass (thumbnails are cached afterwards). If anyone complains, replace this
// with the in-process QuickLookThumbnailing framework (QLThumbnailGenerator via objc2): no
// subprocess, no Dock activity, faster, async. See chat for the full pros/cons.
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
            // Bump mtime so eviction treats this as recently used (cheap LRU proxy).
            let _ = std::fs::OpenOptions::new()
                .write(true)
                .open(&out)
                .and_then(|f| f.set_modified(SystemTime::now()));
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

// Max size of the on-disk thumbnail cache before least-recently-used entries are evicted.
const MAX_THUMBNAIL_CACHE_BYTES: u64 = 200 * 1024 * 1024;

// Evict least-recently-used thumbnails when the cache grows past the limit. get_thumbnail bumps
// each file's mtime on a cache hit, so the oldest mtime ≈ least recently used. Best-effort:
// any IO error just leaves that file in place. Run off the UI thread (e.g. at startup).
pub fn prune_thumbnail_cache(cache_dir: &Path) {
    let mut files: Vec<(PathBuf, SystemTime, u64)> = match fs::read_dir(cache_dir) {
        Ok(entries) => entries
            .flatten()
            .filter_map(|entry| {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) != Some("jpg") {
                    return None;
                }
                let metadata = entry.metadata().ok()?;
                Some((path, metadata.modified().ok()?, metadata.len()))
            })
            .collect(),
        Err(_) => return,
    };

    let mut total: u64 = files.iter().map(|(_, _, len)| len).sum();
    if total <= MAX_THUMBNAIL_CACHE_BYTES {
        return;
    }

    // Oldest (least recently used) first.
    files.sort_by_key(|(_, mtime, _)| *mtime);

    for (path, _, len) in files {
        if total <= MAX_THUMBNAIL_CACHE_BYTES {
            break;
        }
        if fs::remove_file(&path).is_ok() {
            total = total.saturating_sub(len);
        }
    }
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

// Streamed copy/move progress, sent to the frontend over an IPC Channel as bytes are processed.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressPayload {
    processed: u64,
    total: u64,
}

// Total bytes a copy will move: the file's own length, or the recursive sum for a directory.
fn entry_total_bytes(path: &Path) -> u64 {
    if path.is_dir() {
        jwalk::WalkDir::new(path)
            .skip_hidden(false)
            .into_iter()
            .filter_map(|entry| entry.ok())
            .filter(|entry| entry.file_type().is_file())
            .filter_map(|entry| entry.metadata().ok())
            .map(|metadata| metadata.len())
            .sum()
    } else {
        fs::metadata(path).map(|m| m.len()).unwrap_or(0)
    }
}

// Emit progress only when the whole-percent figure changes, so a folder with thousands of files
// produces at most ~100 messages instead of one per file.
fn emit_progress(
    processed: u64,
    total: u64,
    last_percent: &mut i32,
    channel: &Channel<ProgressPayload>,
) {
    let percent = if total == 0 {
        100
    } else {
        ((processed.min(total) * 100) / total) as i32
    };
    if percent != *last_percent {
        *last_percent = percent;
        channel.send(ProgressPayload { processed, total }).ok();
    }
}

// Recursive directory copy that accumulates copied bytes and reports progress per file.
fn copy_dir_with_progress(
    src: &Path,
    dest: &Path,
    processed: &mut u64,
    total: u64,
    last_percent: &mut i32,
    channel: &Channel<ProgressPayload>,
) -> std::io::Result<()> {
    fs::create_dir_all(dest)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let path = entry.path();
        let target = dest.join(entry.file_name());
        if path.is_dir() {
            copy_dir_with_progress(&path, &target, processed, total, last_percent, channel)?;
        } else {
            let len = entry.metadata().map(|m| m.len()).unwrap_or(0);
            fs::copy(&path, &target)?;
            *processed += len;
            emit_progress(*processed, total, last_percent, channel);
        }
    }
    Ok(())
}

// Copy `src` into `dest` (file or directory), reporting byte progress over `channel`.
fn copy_with_progress(
    src: &Path,
    dest: &Path,
    channel: &Channel<ProgressPayload>,
) -> std::io::Result<()> {
    let total = entry_total_bytes(src);
    channel.send(ProgressPayload { processed: 0, total }).ok();

    let mut processed = 0u64;
    let mut last_percent = 0i32;
    if src.is_dir() {
        copy_dir_with_progress(src, dest, &mut processed, total, &mut last_percent, channel)?;
    } else {
        fs::copy(src, dest)?;
    }

    // Always finish at 100% (covers single files and the rounding tail).
    channel.send(ProgressPayload { processed: total, total }).ok();
    Ok(())
}

// Copy a file or directory into dest_dir (recursively for dirs), avoiding name collisions.
// async + spawn_blocking so a large recursive copy runs on a blocking-thread-pool thread instead
// of Tauri's main thread — otherwise the whole webview freezes until the copy finishes.
#[tauri::command]
pub async fn copy_entry(
    source: String,
    dest_dir: String,
    on_progress: Channel<ProgressPayload>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let src = Path::new(&source);
        let name = src
            .file_name()
            .ok_or_else(|| "Invalid source path".to_string())?;
        let dest = unique_dest(Path::new(&dest_dir), name);

        copy_with_progress(src, &dest, &on_progress).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

// Move a file or directory into dest_dir. Fast rename when possible, copy + delete across volumes.
// Runs on a blocking thread (cross-volume moves copy the whole tree) to keep the UI responsive.
#[tauri::command]
pub async fn move_entry(
    source: String,
    dest_dir: String,
    on_progress: Channel<ProgressPayload>,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let src = Path::new(&source);
        let name = src
            .file_name()
            .ok_or_else(|| "Invalid source path".to_string())?;
        let dest = unique_dest(Path::new(&dest_dir), name);

        // Same-volume move is an instant rename — report it as immediately complete.
        if fs::rename(src, &dest).is_ok() {
            on_progress
                .send(ProgressPayload {
                    processed: 1,
                    total: 1,
                })
                .ok();
            return Ok(());
        }

        // Cross-volume: copy with progress, then remove the source.
        copy_with_progress(src, &dest, &on_progress).map_err(|e| e.to_string())?;
        if src.is_dir() {
            fs::remove_dir_all(src).map_err(|e| e.to_string())
        } else {
            fs::remove_file(src).map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
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

// Copy an image file to the system clipboard (as a bitmap), so it can be pasted into other
// apps. Decodes to RGBA8 and hands it to the OS clipboard.
#[tauri::command]
pub fn copy_image(path: String) -> Result<(), String> {
    let rgba = image::open(&path).map_err(|e| e.to_string())?.to_rgba8();
    let (width, height) = rgba.dimensions();

    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard
        .set_image(arboard::ImageData {
            width: width as usize,
            height: height as usize,
            bytes: std::borrow::Cow::Owned(rgba.into_raw()),
        })
        .map_err(|e| e.to_string())
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

// Filename prefix for the temp files our write-probe creates. Also used to keep these out of the
// user's Recents (see get_recent_files).
const WRITE_PROBE_PREFIX: &str = ".sfb_write_probe_";

// Probe whether `path` (a directory) is actually writable, by creating and immediately deleting a
// temp file in it. The reliable source of truth for read-only mounts (e.g. NTFS on macOS without a
// write-capable driver), where the filesystem may report space but reject writes.
#[tauri::command]
pub fn can_write(path: String) -> bool {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return false;
    }
    let probe = dir.join(format!("{}{}", WRITE_PROBE_PREFIX, std::process::id()));
    match fs::File::create(&probe) {
        Ok(_) => {
            let _ = fs::remove_file(&probe);
            true
        }
        Err(_) => false,
    }
}

// Where a trashed item came from, so Restore can put it back to its original folder. macOS
// doesn't expose Finder's "Put Back" data to us, so we record it ourselves when our app trashes
// something. Keyed by the item's name (not its in-trash path) so recording needs no Trash access,
// which is TCC-gated. Stored as a list (not a TOML map) to sidestep dotted-key quoting issues.
#[derive(Debug, Default, Serialize, Deserialize)]
struct TrashOrigins {
    #[serde(default)]
    entries: Vec<TrashOrigin>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TrashOrigin {
    name: String,
    original: String,
}

fn trash_origins_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("trash-origins.toml"))
}

fn load_trash_origins(app: &AppHandle) -> TrashOrigins {
    match trash_origins_path(app)
        .and_then(|p| std::fs::read_to_string(p).map_err(|e| e.to_string()))
    {
        Ok(content) => toml::from_str(&content).unwrap_or_default(),
        Err(_) => TrashOrigins::default(),
    }
}

fn save_trash_origins(app: &AppHandle, origins: &TrashOrigins) {
    if let Ok(target) = trash_origins_path(app) {
        if let Some(parent) = target.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        if let Ok(serialized) = toml::to_string_pretty(origins) {
            let _ = std::fs::write(target, serialized);
        }
    }
}

// Remember where `original` lived (by its name), replacing any prior record for the same name.
fn record_trash_origin(app: &AppHandle, original: &str) {
    let Some(name) = Path::new(original).file_name().and_then(|n| n.to_str()) else {
        return;
    };
    let mut origins = load_trash_origins(app);
    origins.entries.retain(|entry| entry.name != name);
    origins.entries.push(TrashOrigin {
        name: name.to_string(),
        original: original.to_string(),
    });
    save_trash_origins(app, &origins);
}

// Move an entry to the system Trash/Recycle Bin (reversible), recording where it came from so it
// can be restored later.
//
// On macOS the `trash` crate defaults to the Finder method (osascript "tell Finder to delete"),
// which requires Automation/Apple Events permission. In an unsigned/dev bundle that prompt can be
// denied or fail, so files never reach ~/.Trash. Force the NsFileManager backend (trashItemAtURL):
// no permission needed, faster, and reliably moves the item to the volume's Trash.
#[tauri::command]
pub fn delete_entry(app: AppHandle, path: String) -> Result<(), String> {
    println!("[delete_entry] trashing: {}", path);

    let result: Result<(), String> = {
        #[cfg(target_os = "macos")]
        {
            use trash::macos::{DeleteMethod, TrashContextExtMacos};
            let mut ctx = trash::TrashContext::default();
            ctx.set_delete_method(DeleteMethod::NsFileManager);
            ctx.delete(&path).map_err(|e| e.to_string())
        }
        #[cfg(not(target_os = "macos"))]
        {
            trash::delete(&path).map_err(|e| e.to_string())
        }
    };

    if result.is_ok() {
        record_trash_origin(&app, &path);
    }
    result
}

// Restore a trashed item to its recorded original location (put-back). Returns the destination
// path on success, or None when we have no record for it (the frontend then asks the user where
// to restore it). Reads the item out of the Trash, so it needs Full Disk Access — but the user is
// already viewing the Trash to invoke this, so that's granted.
#[tauri::command]
pub fn restore_trashed(app: AppHandle, trashed_path: String) -> Result<Option<String>, String> {
    let Some(name) = Path::new(&trashed_path)
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
    else {
        return Ok(None);
    };

    let mut origins = load_trash_origins(&app);
    let Some(index) = origins.entries.iter().position(|entry| entry.name == name) else {
        return Ok(None);
    };

    let original = origins.entries[index].original.clone();
    let original_path = Path::new(&original);
    let parent = original_path
        .parent()
        .ok_or_else(|| "Original location has no parent".to_string())?;
    let file_name = original_path
        .file_name()
        .ok_or_else(|| "Original location has no name".to_string())?;

    // Recreate the original folder if it's gone, and avoid clobbering an existing file there.
    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    let dest = unique_dest(parent, file_name);
    std::fs::rename(&trashed_path, &dest).map_err(|e| e.to_string())?;

    origins.entries.remove(index);
    save_trash_origins(&app, &origins);
    Ok(Some(dest.to_string_lossy().to_string()))
}

// Permanently delete a file or directory, bypassing the Trash (irreversible). Backs the
// Shift+Delete shortcut. Directories are removed recursively.
#[tauri::command]
pub async fn delete_entry_permanently(path: String) -> Result<(), String> {
    println!("[delete_entry_permanently] deleting: {}", path);

    // Recursive removal of a large tree can take a while — run it off the main thread.
    tauri::async_runtime::spawn_blocking(move || {
        let p = Path::new(&path);
        if p.is_dir() {
            fs::remove_dir_all(p).map_err(|e| e.to_string())
        } else {
            fs::remove_file(p).map_err(|e| e.to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// Permanently empty the user's Trash (~/.Trash), removing every item it contains. Irreversible.
// Returns the number of top-level items removed. macOS guards ~/.Trash behind Full Disk Access
// (TCC), so reading it can fail with a permission error just like listing it in the UI.
//
// Uses `symlink_metadata` so a symlink in the Trash is deleted as a link (never followed into the
// target's directory). Per-volume Trashes (/Volumes/*/.Trashes) are intentionally out of scope.
#[tauri::command]
pub async fn empty_trash() -> Result<u32, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let trash = Path::new(&home).join(".Trash");
        if !trash.exists() {
            return Ok(0);
        }

        let mut removed = 0u32;
        let mut last_err: Option<String> = None;
        for entry in fs::read_dir(&trash).map_err(|e| e.to_string())? {
            let path = match entry {
                Ok(entry) => entry.path(),
                Err(e) => {
                    last_err = Some(e.to_string());
                    continue;
                }
            };

            let is_dir = match fs::symlink_metadata(&path) {
                Ok(meta) => meta.is_dir(),
                Err(e) => {
                    last_err = Some(e.to_string());
                    continue;
                }
            };

            let result = if is_dir {
                fs::remove_dir_all(&path)
            } else {
                fs::remove_file(&path)
            };
            match result {
                Ok(()) => removed += 1,
                Err(e) => last_err = Some(e.to_string()),
            }
        }

        // Surface a failure only if nothing could be removed; a partial empty still reports its count.
        if removed == 0 {
            if let Some(e) = last_err {
                return Err(e);
            }
        }
        Ok(removed)
    })
    .await
    .map_err(|e| e.to_string())?
}

// Most recent files to return (Finder-style "Recents").
const RECENTS_LIMIT: usize = 50;

// Recently modified files in the user's home, à la Finder's Recents smart folder. Backed by
// Spotlight (`mdfind`), so it only works on macOS with indexing enabled. Returns files newest
// first; directories are excluded (Finder shows documents).
//
// When `hide_app_files` is set, files this app writes in the background are filtered out so the
// list reflects the user's own activity, not ours: our config and cache directories, and the
// write-probe temp files. Other apps' Library files are left untouched.
#[tauri::command]
pub async fn get_recent_files(
    app: AppHandle,
    hide_app_files: bool,
) -> Result<Vec<DirEntry>, String> {
    // Resolve our own directories on the calling thread (PathBuf is Send into the blocking task).
    let app_dirs: Vec<PathBuf> = if hide_app_files {
        [app.path().app_config_dir(), app.path().app_cache_dir()]
            .into_iter()
            .flatten()
            .collect()
    } else {
        Vec::new()
    };

    tauri::async_runtime::spawn_blocking(move || {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        let output = std::process::Command::new("mdfind")
            .arg("-onlyin")
            .arg(&home)
            .arg("kMDItemContentModificationDate >= $time.today(-30)")
            .output()
            .map_err(|e| e.to_string())?;

        let is_app_file = |entry: &DirEntry| -> bool {
            if app_dirs.iter().any(|dir| entry.path.starts_with(dir)) {
                return true;
            }
            entry
                .path
                .file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.starts_with(WRITE_PROBE_PREFIX))
                .unwrap_or(false)
        };

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut entries: Vec<DirEntry> = stdout
            .lines()
            .filter(|line| !line.is_empty())
            .filter_map(|line| build_dir_entry(PathBuf::from(line)).ok())
            .filter(|entry| entry.metadata.is_file)
            .filter(|entry| !is_app_file(entry))
            .collect();

        // Newest first, then cap.
        entries.sort_by(|a, b| b.metadata.modified.cmp(&a.metadata.modified));
        entries.truncate(RECENTS_LIMIT);
        Ok(entries)
    })
    .await
    .map_err(|e| e.to_string())?
}
