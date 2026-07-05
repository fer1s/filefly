use std::process::Command;

// Deep link to the Full Disk Access pane in macOS System Settings.
#[cfg(target_os = "macos")]
const FULL_DISK_ACCESS_URL: &str =
    "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

// Open the OS privacy settings where the user can grant the app permission to read protected
// folders (like the Trash). macOS only; other platforms don't gate the Trash this way.
#[tauri::command]
pub fn open_full_disk_access_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("/usr/bin/open")
            .arg(FULL_DISK_ACCESS_URL)
            .spawn()
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = Command::new("true");
        Ok(())
    }
}

// Candidate system-monitor launchers on Linux, tried in order until one spawns. Desktops ship
// different tools (GNOME, KDE Plasma old/new, XFCE, LXQt), so we probe the common ones.
#[cfg(all(unix, not(target_os = "macos")))]
const LINUX_MONITORS: &[&str] = &[
    "gnome-system-monitor",
    "plasma-systemmonitor",
    "ksysguard",
    "xfce4-taskmanager",
    "mate-system-monitor",
    "lxqt-taskmanager",
];

// Open the OS's resource monitor: Activity Monitor (macOS), Task Manager (Windows), or the
// desktop's system monitor (Linux). Backs clicking the CPU/RAM readout in the status bar. Runs off
// the UI thread since it spawns a process.
#[tauri::command]
pub async fn open_system_monitor() -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        #[cfg(target_os = "macos")]
        {
            Command::new("/usr/bin/open")
                .args(["-a", "Activity Monitor"])
                .spawn()
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        #[cfg(target_os = "windows")]
        {
            Command::new("taskmgr")
                .spawn()
                .map(|_| ())
                .map_err(|error| error.to_string())
        }

        #[cfg(all(unix, not(target_os = "macos")))]
        {
            for monitor in LINUX_MONITORS {
                if Command::new(monitor).spawn().is_ok() {
                    return Ok(());
                }
            }
            Err("No system monitor found".to_string())
        }

        #[cfg(not(any(target_os = "macos", target_os = "windows", unix)))]
        {
            Err("Opening the system monitor is not supported on this platform".to_string())
        }
    })
    .await
    .map_err(|error| error.to_string())?
}
