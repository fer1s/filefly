use crate::utils::format_bytes;

use std::path::PathBuf;
use sysinfo::{Disks, System};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    name: String,
    mount_point: PathBuf,
    available_space: String,
    total_space: String,
    disk_usage: DiskUsage,
    is_removable: bool,
    // Whether the volume can be ejected/unmounted: removable media, or anything mounted under
    // /Volumes (external disks, disk images, extra partitions) — what Finder offers to eject. The
    // boot volume ("/") and internal helper volumes (/System/Volumes/…) are never ejectable.
    is_ejectable: bool,
    // Lowercased filesystem type (e.g. "ntfs", "apfs", "exfat"). Used to warn about read-only
    // NTFS on macOS (which has no native write support).
    file_system: String,
    // Raw byte counts (the *_space strings above are pre-formatted). Let the frontend show a
    // volume's used size instantly in Properties instead of recursively walking the whole disk.
    total_bytes: u64,
    available_bytes: u64,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct DiskUsage {
    used: String,
    percentage: u8,
}

fn format_disk_usage(available_space: &u64, &total_space: &u64) -> DiskUsage {
    let used = total_space - available_space;
    let total = total_space.clone() as f64;

    DiskUsage {
        used: format_bytes(&used),
        percentage: ((used as f64 / total as f64) * 100 as f64).floor() as u8,
    }
}

#[tauri::command]
pub fn get_host_name() -> Option<String> {
    System::host_name()
}

// Eject/unmount a removable volume by its mount point. macOS only (`diskutil eject`); other
// platforms report it as unsupported. Runs off the UI thread since it spawns a process.
#[tauri::command]
pub async fn eject_volume(mount_point: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        #[cfg(target_os = "macos")]
        {
            let output = std::process::Command::new("diskutil")
                .arg("eject")
                .arg(&mount_point)
                .output()
                .map_err(|e| e.to_string())?;
            if output.status.success() {
                Ok(())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
            }
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = &mount_point;
            Err("Eject is only supported on macOS".to_string())
        }
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub fn get_volumes() -> Vec<Volume> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut volumes: Vec<Volume> = Vec::new();
    let disks = Disks::new_with_refreshed_list();

    for disk in &disks {
        let available_space = disk.available_space();
        let total_space = disk.total_space();

        volumes.push(Volume {
            name: {
                let name = disk.name().to_str().unwrap();
                match name.is_empty() {
                    true => "Local Volume",
                    false => name,
                }
                .to_string()
            },
            mount_point: disk.mount_point().to_path_buf(),
            available_space: format_bytes(&available_space),
            total_space: format_bytes(&total_space),
            disk_usage: format_disk_usage(&available_space, &total_space),
            is_removable: disk.is_removable(),
            is_ejectable: disk.is_removable() || disk.mount_point().starts_with("/Volumes/"),
            file_system: disk.file_system().to_string_lossy().to_lowercase(),
            total_bytes: total_space,
            available_bytes: available_space,
        });
    }

    volumes
}
