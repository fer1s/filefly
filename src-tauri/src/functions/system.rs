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
