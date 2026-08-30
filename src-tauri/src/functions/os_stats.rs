use std::path::Path;
use std::sync::Mutex;

use sysinfo::{Disks, System};

// A live snapshot of host resource usage for the optional status-bar readout (gated behind the
// showSystemStats setting). CPU is a 0..100 percentage across all cores; memory and disk are raw
// byte counts the frontend formats. Disk reflects the boot volume ("/"), the one users think of as
// "my drive".
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStats {
    cpu_usage: f32,
    mem_used: u64,
    mem_total: u64,
    disk_used: u64,
    disk_total: u64,
}

// Persistent System kept in Tauri state so consecutive polls yield real CPU deltas without an
// artificial sleep: sysinfo needs two refreshes spaced apart to compute CPU %, and the frontend
// polls on an interval, so the gap between calls IS that spacing.
pub struct StatsState(pub Mutex<System>);

impl Default for StatsState {
    fn default() -> Self {
        // new_all seeds the CPU list so the first refresh has a baseline to diff against.
        StatsState(Mutex::new(System::new_all()))
    }
}

// Current CPU / memory / boot-disk usage. Cheap enough to call on a short poll interval: CPU and
// memory refresh the shared System in place; disks are re-listed each call (there's no per-poll
// state to keep for them). The first call after launch may report 0% CPU (no prior sample yet).
#[tauri::command]
pub fn get_system_stats(state: tauri::State<'_, StatsState>) -> SystemStats {
    let mut sys = state.0.lock().unwrap();
    sys.refresh_cpu();
    sys.refresh_memory();

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let mem_total = sys.total_memory();
    let mem_used = sys.used_memory();

    let disks = Disks::new_with_refreshed_list();
    let (disk_total, disk_used) = disks
        .iter()
        .find(|disk| disk.mount_point() == Path::new("/"))
        .or_else(|| disks.iter().next())
        .map(|disk| {
            (
                disk.total_space(),
                disk.total_space() - disk.available_space(),
            )
        })
        .unwrap_or((0, 0));

    SystemStats {
        cpu_usage,
        mem_used,
        mem_total,
        disk_used,
        disk_total,
    }
}
