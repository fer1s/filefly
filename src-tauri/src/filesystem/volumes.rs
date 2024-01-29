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
        });
    }

    volumes
}