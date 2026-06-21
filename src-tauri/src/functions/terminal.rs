use std::path::Path;
use std::process::Command;

#[cfg(target_os = "macos")]
fn open_terminal(path: &Path) -> Result<(), String> {
    Command::new("/usr/bin/open")
        .args(["-a", "Terminal"])
        .arg(path)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "windows")]
fn open_terminal(path: &Path) -> Result<(), String> {
    let change_directory = format!("cd /D \"{}\"", path.display());

    Command::new("cmd.exe")
        .args(["/C", "start", "", "cmd.exe", "/K"])
        .arg(change_directory)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "linux")]
fn open_terminal(path: &Path) -> Result<(), String> {
    const TERMINALS: &[&str] = &[
        "xdg-terminal-exec",
        "x-terminal-emulator",
        "gnome-terminal",
        "konsole",
        "xfce4-terminal",
        "kitty",
        "alacritty",
        "xterm",
    ];

    for terminal in TERMINALS {
        match Command::new(terminal).current_dir(path).spawn() {
            Ok(_) => return Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(error.to_string()),
        }
    }

    Err("No supported terminal application was found".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn open_terminal(_path: &Path) -> Result<(), String> {
    Err("Opening a terminal is not supported on this platform".to_string())
}

#[tauri::command]
pub fn open_in_terminal(path: String) -> Result<(), String> {
    let target = Path::new(&path);
    if !target.exists() {
        return Err("The selected path does not exist".to_string());
    }

    let directory = if target.is_dir() {
        target
    } else {
        target
            .parent()
            .ok_or_else(|| "The selected file has no parent directory".to_string())?
    };

    open_terminal(directory)
}
