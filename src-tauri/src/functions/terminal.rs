use std::path::Path;
use std::process::Command;

use tauri::{AppHandle, Manager};

use crate::filesystem::sftp::{load_connections, resolve, Target};

// Single-quote a string for POSIX shell: wrap in '…', escaping any embedded ' as '\''.
#[cfg(any(target_os = "macos", target_os = "linux"))]
fn shell_quote(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}

// Open an interactive SSH session in a terminal, landing in `remote_dir` (like `ssh` + `cd`). On
// macOS this writes a tiny .command script and opens it (avoids nested AppleScript/shell escaping);
// on Linux the ssh argv is handed straight to the terminal emulator.
#[cfg(target_os = "macos")]
fn open_ssh_terminal(
    app: &AppHandle,
    user: &str,
    host: &str,
    port: u16,
    remote_dir: &str,
) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;

    // Runs on the remote shell: cd into the folder, then hand over to a login shell. $SHELL stays
    // literal locally (single-quoted) so it expands on the server.
    let remote_cmd = format!("cd {} && exec $SHELL -l", shell_quote(remote_dir));
    let ssh = format!(
        "ssh -t -p {port} {} {}",
        shell_quote(&format!("{user}@{host}")),
        shell_quote(&remote_cmd),
    );
    let script = format!("#!/bin/bash\nexec {ssh}\n");

    let dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| e.to_string())?
        .join("ssh");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    // One reused file per host so these don't pile up in the cache.
    let file = dir.join(format!("ssh-{host}.command"));
    std::fs::write(&file, script).map_err(|e| e.to_string())?;
    std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o755))
        .map_err(|e| e.to_string())?;

    Command::new("/usr/bin/open")
        .arg(&file)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[cfg(target_os = "linux")]
fn open_ssh_terminal(
    _app: &AppHandle,
    user: &str,
    host: &str,
    port: u16,
    remote_dir: &str,
) -> Result<(), String> {
    let remote_cmd = format!("cd {} && exec $SHELL -l", shell_quote(remote_dir));
    const TERMINALS: &[&str] = &[
        "x-terminal-emulator",
        "gnome-terminal",
        "konsole",
        "xfce4-terminal",
        "kitty",
        "alacritty",
        "xterm",
    ];
    for terminal in TERMINALS {
        // `-e ssh …` — args are passed directly (no extra shell), so no local quoting needed.
        match Command::new(terminal)
            .args([
                "-e",
                "ssh",
                "-t",
                "-p",
                &port.to_string(),
                &format!("{user}@{host}"),
                &remote_cmd,
            ])
            .spawn()
        {
            Ok(_) => return Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(error.to_string()),
        }
    }
    Err("No supported terminal application was found".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn open_ssh_terminal(
    _app: &AppHandle,
    _user: &str,
    _host: &str,
    _port: u16,
    _remote_dir: &str,
) -> Result<(), String> {
    Err("Opening a remote terminal is not supported on this platform".to_string())
}

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
pub fn open_in_terminal(app: AppHandle, path: String) -> Result<(), String> {
    // Remote paths open an SSH session (cd'd into the folder); local paths open a local terminal.
    // The caller already resolves a file to its parent directory, so `path` is a directory.
    if let Target::Remote { conn, path: remote } = resolve(&path) {
        let connection = load_connections(&app)
            .into_iter()
            .find(|c| c.id == conn)
            .ok_or_else(|| format!("unknown connection '{conn}'"))?;
        return open_ssh_terminal(
            &app,
            &connection.user,
            &connection.host,
            connection.port,
            &remote,
        );
    }

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
