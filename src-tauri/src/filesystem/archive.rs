//! Archive operations (compress / extract). The cores are shared by the Tauri GUI command wrappers
//! and the `sfb` CLI, matching the copy/move split in `fs.rs`: a sync `*_core` does the work and
//! reports byte progress through a generic `progress` sink, while the `#[tauri::command]` wrappers
//! run it on a blocking thread and forward progress to an IPC Channel.
//!
//! v1 handles `.zip` via the pure-Rust `zip` crate (no system binary). 7z/rar are planned as a
//! separate path that shells out to the system `7z`/`rar` binaries (detected on PATH).

use std::collections::HashMap;
use std::ffi::{OsStr, OsString};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Component, Path, PathBuf};
use std::process::{Command, Stdio};

use serde::Serialize;
use tauri::ipc::Channel;
use zip::write::{FileOptions, SimpleFileOptions};
use zip::{AesMode, CompressionMethod, ZipArchive, ZipWriter};

use super::fs::{entry_total_bytes, unique_dest};

// Byte progress streamed to the frontend as an archive is written/read. Same shape as fs.rs's
// ProgressPayload (its fields are private), so the frontend reuses the CopyProgress channel type.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveProgress {
    processed: u64,
    total: u64,
}

// Emit progress only when the whole-percent figure changes (mirrors fs::emit_progress), so a big
// tree yields ~100 callbacks instead of one per chunk.
fn emit_percent(
    processed: u64,
    total: u64,
    last_percent: &mut i32,
    progress: &mut dyn FnMut(u64, u64),
) {
    let percent = if total == 0 {
        100
    } else {
        ((processed.min(total) * 100) / total) as i32
    };
    if percent != *last_percent {
        *last_percent = percent;
        progress(processed, total);
    }
}

// Recursively add `src` to the zip. Entry names are relative to `base` (the parent of the original
// source) so a folder source recreates its own top directory on extraction and a file source lands
// at the archive root. Reads files in chunks, accumulating processed input bytes for progress.
fn add_entry(
    writer: &mut ZipWriter<File>,
    src: &Path,
    base: &Path,
    options: &FileOptions<()>,
    processed: &mut u64,
    total: u64,
    last_percent: &mut i32,
    progress: &mut dyn FnMut(u64, u64),
) -> Result<(), String> {
    // Zip entry paths always use forward slashes, regardless of the host OS.
    let name = src
        .strip_prefix(base)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");

    if src.is_dir() {
        if !name.is_empty() {
            writer
                .add_directory(format!("{}/", name), options.clone())
                .map_err(|e| e.to_string())?;
        }
        let mut entries: Vec<_> = fs::read_dir(src)
            .map_err(|e| e.to_string())?
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .collect();
        // Stable, deterministic ordering inside the archive.
        entries.sort();
        for path in entries {
            add_entry(
                writer,
                &path,
                base,
                options,
                processed,
                total,
                last_percent,
                progress,
            )?;
        }
    } else {
        writer
            .start_file(name, options.clone())
            .map_err(|e| e.to_string())?;
        let mut file = File::open(src).map_err(|e| e.to_string())?;
        let mut buf = [0u8; 65536];
        loop {
            let read = file.read(&mut buf).map_err(|e| e.to_string())?;
            if read == 0 {
                break;
            }
            writer.write_all(&buf[..read]).map_err(|e| e.to_string())?;
            *processed += read as u64;
            emit_percent(*processed, total, last_percent, progress);
        }
    }
    Ok(())
}

// Compress `sources` into a new `archive_name` (a *.zip file name) inside `dest_dir`, avoiding name
// collisions. `level` is the DEFLATE level 0..=9. When `password` is set, entries are encrypted with
// AES-256 (WinZip AE). Returns the created archive's path. Shared by the Tauri command and the CLI.
pub fn compress_entries_core(
    sources: &[String],
    dest_dir: &str,
    archive_name: &str,
    level: i64,
    password: Option<&str>,
    progress: &mut dyn FnMut(u64, u64),
) -> Result<String, String> {
    if sources.is_empty() {
        return Err("No entries to compress".to_string());
    }

    let dest = unique_dest(Path::new(dest_dir), std::ffi::OsStr::new(archive_name));
    let total: u64 = sources
        .iter()
        .map(|s| entry_total_bytes(Path::new(s)))
        .sum();
    progress(0, total);

    let file = File::create(&dest).map_err(|e| e.to_string())?;
    let mut writer = ZipWriter::new(file);
    let mut options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .compression_level(Some(level.clamp(0, 9)))
        .unix_permissions(0o644);
    // Empty password means "no encryption" — an empty AES password is meaningless.
    if let Some(pw) = password.filter(|p| !p.is_empty()) {
        options = options.with_aes_encryption(AesMode::Aes256, pw);
    }

    let mut processed = 0u64;
    let mut last_percent = 0i32;
    for source in sources {
        let src = Path::new(source);
        // Names are relative to the source's parent, so the entry keeps its own base name.
        let base = src.parent().unwrap_or(Path::new(""));
        add_entry(
            &mut writer,
            src,
            base,
            &options,
            &mut processed,
            total,
            &mut last_percent,
            progress,
        )?;
    }

    writer.finish().map_err(|e| e.to_string())?;
    progress(total, total);
    Ok(dest.to_string_lossy().into_owned())
}

// True if any entry in `archive` is encrypted, so the caller can prompt for a password before
// extracting. Reads entry metadata only (no decryption), so it needs no password itself.
pub fn archive_is_encrypted(archive: &str) -> Result<bool, String> {
    // .7z goes through the 7-Zip binary; everything else is read as a zip.
    if archive.to_lowercase().ends_with(".7z") {
        return sevenzip_is_encrypted(archive);
    }
    let file = File::open(archive).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;
    for i in 0..zip.len() {
        if let Ok(entry) = zip.by_index_raw(i) {
            if entry.encrypted() {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

// Extract the zip `archive` into `dest_dir`, guarding against zip-slip. Encrypted entries are
// decrypted with `password` (a wrong/missing one surfaces as an error).
//
// `into_subfolder` chooses the layout:
//   * true  ("Extract to Folder") — everything lands inside one fresh, uniquely-named subfolder
//     named after the archive.
//   * false ("Extract Here") — the archive's TOP-LEVEL entries land directly in `dest_dir`, each
//     collision-safe on its own. So a single-file archive yields just that file, a group of files
//     yields those files loose, and a folder archive yields just that folder (it's already the
//     archive's top-level entry) — mirroring whatever was originally compressed.
//
// Returns the created top-level output paths (in first-seen order) for the reveal/select toast.
// Shared by command + CLI.
pub fn extract_archive_core(
    archive: &str,
    dest_dir: &str,
    password: Option<&str>,
    into_subfolder: bool,
    progress: &mut dyn FnMut(u64, u64),
) -> Result<Vec<String>, String> {
    let archive_path = Path::new(archive);
    let dest = Path::new(dest_dir);

    let file = File::open(archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;

    // First pass: total uncompressed bytes (for a meaningful progress denominator).
    let mut total = 0u64;
    for i in 0..zip.len() {
        if let Ok(f) = zip.by_index_raw(i) {
            total += f.size();
        }
    }
    progress(0, total);

    // In subfolder mode, create the wrapping folder up front; every entry nests under it.
    let subfolder = if into_subfolder {
        let stem = archive_path
            .file_stem()
            .ok_or_else(|| "Invalid archive path".to_string())?;
        let dir = unique_dest(dest, stem);
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Some(dir)
    } else {
        None
    };

    // Maps each archive top-level segment to its destination path (computed once, on first sight):
    // nested under the subfolder in "to folder" mode, or a uniquified path in `dest_dir` in "here"
    // mode. `outputs` keeps first-seen order for the toast.
    let mut top_map: HashMap<OsString, PathBuf> = HashMap::new();
    let mut outputs: Vec<String> = Vec::new();

    let mut processed = 0u64;
    let mut last_percent = 0i32;
    for i in 0..zip.len() {
        // Peek metadata (no decryption) to pick the right reader per entry — archives can mix
        // encrypted and plaintext files.
        let encrypted = zip
            .by_index_raw(i)
            .map(|e| e.encrypted())
            .unwrap_or(false);
        let mut entry = if encrypted {
            let pw = password
                .filter(|p| !p.is_empty())
                .ok_or_else(|| "Password required".to_string())?;
            zip.by_index_decrypt(i, pw.as_bytes())
                .map_err(|e| e.to_string())?
        } else {
            zip.by_index(i).map_err(|e| e.to_string())?
        };
        // enclosed_name() rejects absolute paths and `..` components (zip-slip protection).
        let rel = match entry.enclosed_name() {
            Some(p) => p,
            None => continue,
        };
        // First path component = the entry's top-level name (a file or a folder).
        let top = match rel.components().next() {
            Some(Component::Normal(s)) => s.to_os_string(),
            _ => continue,
        };
        // Resolve where that top-level name maps on disk (once per distinct name).
        let base = top_map.entry(top.clone()).or_insert_with(|| {
            let mapped = match &subfolder {
                Some(dir) => dir.join(&top),
                None => unique_dest(dest, &top),
            };
            outputs.push(mapped.to_string_lossy().into_owned());
            mapped
        });
        // Reattach the path below the top-level segment onto the mapped base. A root-level file has
        // no remainder, so it maps straight to `base` (joining an empty path would append a stray
        // separator and break File::create).
        let rest = rel.strip_prefix(Path::new(&top)).unwrap_or(Path::new(""));
        let out_path = if rest.as_os_str().is_empty() {
            base.clone()
        } else {
            base.join(rest)
        };

        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
            continue;
        }
        if let Some(parent) = out_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut out = File::create(&out_path).map_err(|e| e.to_string())?;
        let mut buf = [0u8; 65536];
        loop {
            let read = entry.read(&mut buf).map_err(|e| e.to_string())?;
            if read == 0 {
                break;
            }
            out.write_all(&buf[..read]).map_err(|e| e.to_string())?;
            processed += read as u64;
            emit_percent(processed, total, &mut last_percent, progress);
        }
    }

    progress(total, total);
    Ok(outputs)
}

// ---- 7z (shells out to the system 7-Zip binary) ---------------------------------------------
//
// Unlike the pure-Rust zip path, 7z support depends on a 7-Zip binary on PATH (7zz/7z/7za). When
// absent the UI hides the "To 7z" option and extraction of .7z surfaces an install hint. Progress
// is indeterminate (we don't parse the binary's stdout). Password uses -p plus -mhe (encrypt the
// header/file names too).

// First 7-Zip binary found on PATH, or None. `<bin> i` prints build info and exits 0, so a spawn
// error means the binary is missing.
pub fn sevenzip_bin() -> Option<String> {
    for cand in ["7zz", "7z", "7za"] {
        let ok = Command::new(cand)
            .arg("i")
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false);
        if ok {
            return Some(cand.to_string());
        }
    }
    None
}

// True if the system has a usable 7-Zip binary (so the frontend can show/hide the 7z option).
#[tauri::command]
pub async fn sevenzip_available() -> bool {
    tauri::async_runtime::spawn_blocking(|| sevenzip_bin().is_some())
        .await
        .unwrap_or(false)
}

// Compress `sources` into a new `.7z` `archive_name` inside `dest_dir` (collision-safe). `level` maps
// to -mx=0..9; a non-empty `password` encrypts contents and headers. Sources share a parent (they're
// a single-folder selection), so we run from that parent and pass base names — mirroring the zip
// path's entry naming (a folder keeps its top dir, a file lands at the archive root).
pub fn compress_7z_core(
    sources: &[String],
    dest_dir: &str,
    archive_name: &str,
    level: i64,
    password: Option<&str>,
) -> Result<String, String> {
    let bin = sevenzip_bin().ok_or_else(|| "7-Zip not found (install p7zip / 7-Zip)".to_string())?;
    if sources.is_empty() {
        return Err("No entries to compress".to_string());
    }
    let dest = unique_dest(Path::new(dest_dir), OsStr::new(archive_name));
    let parent = Path::new(&sources[0])
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));

    let mut args: Vec<String> = vec![
        "a".to_string(),
        dest.to_string_lossy().into_owned(),
        format!("-mx={}", level.clamp(0, 9)),
    ];
    if let Some(pw) = password.filter(|p| !p.is_empty()) {
        args.push(format!("-p{}", pw));
        args.push("-mhe=on".to_string());
    }
    for s in sources {
        let name = Path::new(s)
            .file_name()
            .ok_or_else(|| format!("Invalid source path: {}", s))?
            .to_string_lossy()
            .into_owned();
        args.push(name);
    }

    let output = Command::new(&bin)
        .current_dir(&parent)
        .args(&args)
        .stdin(Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(format!(
            "7z failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(dest.to_string_lossy().into_owned())
}

// True if a .7z archive is encrypted. `l -slt` lists per-entry properties; an encrypted entry shows
// "Encrypted = +". A header-encrypted archive can't be listed without the password, so the command
// fails — which we treat as encrypted (the UI will then prompt).
fn sevenzip_is_encrypted(archive: &str) -> Result<bool, String> {
    let bin = match sevenzip_bin() {
        Some(b) => b,
        None => return Ok(false),
    };
    let output = Command::new(&bin)
        .args(["l", "-slt", archive])
        .stdin(Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Ok(true);
    }
    let text = String::from_utf8_lossy(&output.stdout);
    Ok(text.lines().any(|l| l.trim() == "Encrypted = +"))
}

// Move the just-extracted temp tree into its final place, mirroring the zip layout choice:
// `into_subfolder` renames the whole temp dir to the archive stem; otherwise each top-level entry is
// moved into `dest` collision-safe. Returns the created top-level paths.
fn relocate_extracted(
    tmp: &Path,
    dest: &Path,
    stem: &OsStr,
    into_subfolder: bool,
) -> Result<Vec<String>, String> {
    if into_subfolder {
        let sub = unique_dest(dest, stem);
        fs::rename(tmp, &sub).map_err(|e| e.to_string())?;
        return Ok(vec![sub.to_string_lossy().into_owned()]);
    }
    let mut outputs = Vec::new();
    for entry in fs::read_dir(tmp).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let target = unique_dest(dest, &entry.file_name());
        fs::rename(entry.path(), &target).map_err(|e| e.to_string())?;
        outputs.push(target.to_string_lossy().into_owned());
    }
    Ok(outputs)
}

// Extract a .7z (or any format 7-Zip reads) into `dest_dir`, with the same here/to-folder layout and
// collision-safety as the zip path. Extracts into a temp dir first, then relocates. `-p` is always
// passed (empty if no password) so an encrypted archive errors instead of blocking on a stdin prompt.
pub fn extract_7z_core(
    archive: &str,
    dest_dir: &str,
    password: Option<&str>,
    into_subfolder: bool,
) -> Result<Vec<String>, String> {
    let bin = sevenzip_bin().ok_or_else(|| "7-Zip not found (install p7zip / 7-Zip)".to_string())?;
    let dest = Path::new(dest_dir);
    let stem = Path::new(archive)
        .file_stem()
        .ok_or_else(|| "Invalid archive path".to_string())?
        .to_os_string();

    let tmp = unique_dest(dest, OsStr::new(".sfb_7z_extract"));
    fs::create_dir_all(&tmp).map_err(|e| e.to_string())?;

    let mut args: Vec<String> = vec![
        "x".to_string(),
        archive.to_string(),
        format!("-o{}", tmp.to_string_lossy()),
        "-y".to_string(),
        "-bd".to_string(),
    ];
    match password.filter(|p| !p.is_empty()) {
        Some(pw) => args.push(format!("-p{}", pw)),
        None => args.push("-p".to_string()),
    }

    let output = Command::new(&bin)
        .args(&args)
        .stdin(Stdio::null())
        .output()
        .map_err(|e| e.to_string())?;
    if !output.status.success() {
        fs::remove_dir_all(&tmp).ok();
        return Err(format!(
            "7z extract failed: {}",
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }

    let result = relocate_extracted(&tmp, dest, &stem, into_subfolder);
    fs::remove_dir_all(&tmp).ok();
    result
}

// Compress the given entries into `dest_dir`. Runs on a blocking thread so a large tree doesn't
// freeze the webview. The archive format is chosen by `archive_name`'s extension: `.7z` shells out
// to 7-Zip (indeterminate progress), anything else is a pure-Rust zip (streamed byte progress).
// Returns the archive path (may differ from dest_dir/archive_name if a collision forced a rename).
#[tauri::command]
pub async fn compress_entries(
    sources: Vec<String>,
    dest_dir: String,
    archive_name: String,
    level: i64,
    password: Option<String>,
    on_progress: Channel<ArchiveProgress>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut sink = |processed, total| {
            on_progress.send(ArchiveProgress { processed, total }).ok();
        };
        if archive_name.to_lowercase().ends_with(".7z") {
            compress_7z_core(&sources, &dest_dir, &archive_name, level, password.as_deref())
        } else {
            compress_entries_core(
                &sources,
                &dest_dir,
                &archive_name,
                level,
                password.as_deref(),
                &mut sink,
            )
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

// Report whether a zip is password-protected, so the frontend can prompt before extracting.
#[tauri::command]
pub async fn archive_encrypted(archive: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || archive_is_encrypted(&archive))
        .await
        .map_err(|e| e.to_string())?
}

// Extract an archive into `dest_dir`. Blocking thread + progress channel, like copy. `.zip` uses the
// pure-Rust path (streamed byte progress); anything else (`.7z`) shells out to 7-Zip (indeterminate).
// `into_subfolder` picks "Extract to Folder" (wrap in a subfolder) vs "Extract Here" (top-level
// entries loose in dest). Returns the created top-level output paths.
#[tauri::command]
pub async fn extract_archive(
    archive: String,
    dest_dir: String,
    password: Option<String>,
    into_subfolder: bool,
    on_progress: Channel<ArchiveProgress>,
) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut sink = |processed, total| {
            on_progress.send(ArchiveProgress { processed, total }).ok();
        };
        if archive.to_lowercase().ends_with(".zip") {
            extract_archive_core(
                &archive,
                &dest_dir,
                password.as_deref(),
                into_subfolder,
                &mut sink,
            )
        } else {
            extract_7z_core(&archive, &dest_dir, password.as_deref(), into_subfolder)
        }
    })
    .await
    .map_err(|e| e.to_string())?
}
