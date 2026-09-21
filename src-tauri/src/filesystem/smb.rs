//! Native SMB diagnostics shared by the CLI and the future GUI connection flow.
//!
//! macOS already provides the SMB client and credential UI. We therefore probe the network here,
//! inspect native mounts, and ask the OS to connect instead of embedding another SMB stack.

use std::net::{TcpStream, ToSocketAddrs};
use std::time::Duration;

use serde::Serialize;

const SMB_PORT: u16 = 445;
// Path scheme marking a saved SMB location: `smb://<host>/<share>`. Mirrors SMB_SCHEME on the
// frontend (constants.ts). Unlike SFTP these are not browsed through a virtual backend — macOS
// mounts the share under /Volumes and the existing local filesystem cores browse it there.
pub const SMB_SCHEME: &str = "smb://";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmbAttempt {
    address: String,
    reachable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmbDiagnostic {
    host: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    share: Option<String>,
    url: String,
    port: u16,
    resolved: bool,
    reachable: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    resolution_error: Option<String>,
    attempts: Vec<SmbAttempt>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmbMount {
    source: String,
    mount_point: String,
    options: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SmbShare {
    name: String,
    // Windows admin shares end in `$` (C$, ADMIN$) and need an administrator account, so the UI can
    // flag or de-emphasize them.
    admin: bool,
}

fn host_for_url(host: &str) -> Result<String, String> {
    let host = host.trim();
    if host.is_empty() {
        return Err("SMB host cannot be empty".to_string());
    }
    if host
        .chars()
        .any(|character| character.is_whitespace() || matches!(character, '/' | '@'))
    {
        return Err("SMB host must be a hostname or IP address".to_string());
    }
    if host.contains(':') && !(host.starts_with('[') && host.ends_with(']')) {
        Ok(format!("[{host}]"))
    } else {
        Ok(host.to_string())
    }
}

fn encode_component(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
            encoded.push(char::from(byte));
        } else {
            encoded.push_str(&format!("%{byte:02X}"));
        }
    }
    encoded
}

pub fn url(host: &str, share: Option<&str>) -> Result<String, String> {
    let host = host_for_url(host)?;
    let share = share.map(str::trim).filter(|value| !value.is_empty());
    if share.is_some_and(|value| {
        value
            .chars()
            .any(|character| matches!(character, '/' | '\\'))
    }) {
        return Err("SMB share must be a share name, not a path".to_string());
    }
    Ok(match share {
        Some(share) => format!("smb://{host}/{}", encode_component(share)),
        None => format!("smb://{host}"),
    })
}

// Resolve the host and try every address on TCP 445. A failed probe is diagnostic data rather than
// a command error, so agents still receive all attempted addresses and their individual failures.
pub fn diagnose(
    host: &str,
    share: Option<&str>,
    timeout: Duration,
) -> Result<SmbDiagnostic, String> {
    let target_url = url(host, share)?;
    let host = host.trim().trim_start_matches('[').trim_end_matches(']');
    eprintln!("[smb] diagnose {target_url} (timeout {timeout:?})");
    let addresses = match (host, SMB_PORT).to_socket_addrs() {
        Ok(addresses) => addresses.collect::<Vec<_>>(),
        Err(error) => {
            eprintln!("[smb] resolve failed for {host}: {error}");
            return Ok(SmbDiagnostic {
                host: host.to_string(),
                share: share.map(str::to_string),
                url: target_url,
                port: SMB_PORT,
                resolved: false,
                reachable: false,
                resolution_error: Some(error.to_string()),
                attempts: Vec::new(),
            });
        }
    };
    eprintln!("[smb] {host} resolved to {} address(es)", addresses.len());

    let attempts = addresses
        .into_iter()
        .map(
            |address| match TcpStream::connect_timeout(&address, timeout) {
                Ok(_) => {
                    eprintln!("[smb]   {address} — 445 open");
                    SmbAttempt {
                        address: address.to_string(),
                        reachable: true,
                        error: None,
                    }
                }
                Err(error) => {
                    eprintln!("[smb]   {address} — 445 unreachable: {error}");
                    SmbAttempt {
                        address: address.to_string(),
                        reachable: false,
                        error: Some(error.to_string()),
                    }
                }
            },
        )
        .collect::<Vec<_>>();
    let reachable = attempts.iter().any(|attempt| attempt.reachable);
    eprintln!("[smb] {host}:445 reachable={reachable}");

    Ok(SmbDiagnostic {
        host: host.to_string(),
        share: share.map(str::to_string),
        url: target_url,
        port: SMB_PORT,
        resolved: !attempts.is_empty(),
        reachable,
        resolution_error: None,
        attempts,
    })
}

// Read the OS mount table and return only SMB volumes. This intentionally reports what macOS has
// actually mounted, including the local /Volumes path the existing filesystem can browse.
#[cfg(target_os = "macos")]
pub fn mounts() -> Result<Vec<SmbMount>, String> {
    let output = std::process::Command::new("/sbin/mount")
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mounts = stdout
        .lines()
        .filter_map(|line| {
            let (source, rest) = line.split_once(" on ")?;
            let (mount_point, raw_options) = rest.rsplit_once(" (")?;
            let options = raw_options
                .strip_suffix(')')?
                .split(',')
                .map(|option| option.trim().to_string())
                .collect::<Vec<_>>();
            if !options.iter().any(|option| option == "smbfs") {
                return None;
            }
            Some(SmbMount {
                source: source.to_string(),
                mount_point: mount_point.to_string(),
                options,
            })
        })
        .collect();
    // Intentionally silent: this is a low-level helper hit on every mount poll (~every 750ms), so
    // logging here would flood the terminal. Callers (mount_point / diagnose) log the outcome.
    Ok(mounts)
}

#[cfg(not(target_os = "macos"))]
pub fn mounts() -> Result<Vec<SmbMount>, String> {
    Err("Native SMB mount inspection is currently supported only on macOS".to_string())
}

// Hand the URL to macOS. Finder owns authentication, Keychain storage, share selection and the
// actual mount; no password is accepted by this API, so it cannot leak through argv or logs.
#[cfg(target_os = "macos")]
pub fn connect(host: &str, share: &str) -> Result<String, String> {
    if share.trim().is_empty() {
        return Err("SMB share cannot be empty".to_string());
    }
    let target_url = url(host, Some(share))?;
    eprintln!("[smb] connect — asking macOS to open {target_url}");
    let output = std::process::Command::new("/usr/bin/open")
        .arg(&target_url)
        .output()
        .map_err(|error| error.to_string())?;
    if output.status.success() {
        eprintln!("[smb] connect — macOS launched the mount for {target_url} (Finder owns auth)");
        Ok(target_url)
    } else {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if error.is_empty() {
            format!("macOS could not open {target_url} ({})", output.status)
        } else {
            error
        };
        eprintln!("[smb] connect — failed: {message}");
        Err(message)
    }
}

#[cfg(not(target_os = "macos"))]
pub fn connect(host: &str, share: &str) -> Result<String, String> {
    let _ = url(host, Some(share))?;
    Err("Native SMB connection is currently supported only on macOS".to_string())
}

// List the disk shares a host exposes, using macOS's own `smbutil view`. This authenticates with
// the Keychain credentials macOS saved on a previous connect, so it works only *after* the user has
// signed in to the server once (there's no anonymous share enumeration here — SMB servers reject
// it). Returns a clear error otherwise, letting the UI fall back to manual entry. Pipe/printer
// shares are dropped; only browsable disk shares are returned.
#[cfg(target_os = "macos")]
pub fn shares(host: &str) -> Result<Vec<SmbShare>, String> {
    let target = host_for_url(host)?;
    eprintln!("[smb] shares — smbutil view //{target}");
    let output = std::process::Command::new("/usr/bin/smbutil")
        .arg("view")
        .arg(format!("//{target}"))
        .output()
        .map_err(|error| error.to_string())?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let message = if error.is_empty() {
            "smbutil could not list shares (sign in to the server once so macOS saves the credentials)".to_string()
        } else {
            error
        };
        eprintln!("[smb] shares — failed: {message}");
        return Err(message);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    // `smbutil view` prints a "Share  Type  Comments" table. Keep rows whose type column is "Disk";
    // the first whitespace-delimited token is the share name. Header/separator/footer lines have no
    // "Disk" column, so they fall out naturally.
    let shares = stdout
        .lines()
        .filter_map(|line| {
            let mut columns = line.split_whitespace();
            let name = columns.next()?;
            if columns.next() != Some("Disk") {
                return None;
            }
            Some(SmbShare {
                name: name.to_string(),
                admin: name.ends_with('$'),
            })
        })
        .collect::<Vec<_>>();
    eprintln!("[smb] shares — {} disk share(s)", shares.len());
    Ok(shares)
}

#[cfg(not(target_os = "macos"))]
pub fn shares(host: &str) -> Result<Vec<SmbShare>, String> {
    let _ = host;
    Err("Native SMB share listing is currently supported only on macOS".to_string())
}

// Build the sidebar-location path for a share: `smb://<host>/<share>[#<name>]`. Host and share are
// stored raw (this is our own scheme, parsed back by the frontend, never fetched as a real URL);
// the optional display name rides along as a `#name` fragment. Mirrors SmbManager.path on the
// frontend so the CLI and GUI produce identical entries.
pub fn location_path(host: &str, share: &str, name: Option<&str>) -> String {
    let host = host.trim();
    let share = share.trim();
    let base = format!("{SMB_SCHEME}{host}/{share}");
    match name.map(str::trim).filter(|n| !n.is_empty() && *n != share) {
        Some(name) => format!("{base}#{name}"),
        None => base,
    }
}

// Split a mount source (`//user@host/share` or `//host/share`) into its host and share, dropping
// any `user@` prefix. Returns None for anything that isn't a two-part SMB source.
fn source_host_share(source: &str) -> Option<(&str, &str)> {
    let body = source.trim_start_matches('/');
    let (authority, share) = body.split_once('/')?;
    let host = authority.rsplit_once('@').map_or(authority, |(_, h)| h);
    let share = share.split('/').next().unwrap_or(share);
    if host.is_empty() || share.is_empty() {
        None
    } else {
        Some((host, share))
    }
}

// The local `/Volumes/...` path a given host/share is already mounted at, if any. Host match is
// case-insensitive (DNS) and share match is case-insensitive (SMB shares are), so a location saved
// as `smb://HOST/Share` still resolves a mount macOS created as `//host/share`.
pub fn mount_point(host: &str, share: &str) -> Result<Option<String>, String> {
    let host = host.trim();
    let share = share.trim();
    let found = mounts()?.into_iter().find_map(|mount| {
        let (mount_host, mount_share) = source_host_share(&mount.source)?;
        (mount_host.eq_ignore_ascii_case(host) && mount_share.eq_ignore_ascii_case(share))
            .then_some(mount.mount_point)
    });
    match &found {
        Some(path) => eprintln!("[smb] mount_point //{host}/{share} -> {path}"),
        None => eprintln!("[smb] mount_point //{host}/{share} -> not mounted"),
    }
    Ok(found)
}

// ---- Tauri commands (thin wrappers so the GUI shares the CLI's SMB cores) ---------------------

// Resolve an SMB host and probe TCP 445 without authenticating. A failed probe is data, not an
// error, so the frontend can show why a share is unreachable (see the CLI's `smb-diagnose`).
#[tauri::command]
pub fn smb_diagnose(
    host: String,
    share: Option<String>,
    timeout_ms: Option<u64>,
) -> Result<SmbDiagnostic, String> {
    let timeout_ms = timeout_ms.unwrap_or(2_000);
    if timeout_ms == 0 || timeout_ms > 60_000 {
        return Err("timeout_ms must be between 1 and 60000".to_string());
    }
    diagnose(&host, share.as_deref(), Duration::from_millis(timeout_ms))
}

// The SMB shares macOS currently has mounted, with their local /Volumes paths.
#[tauri::command]
pub fn smb_mounts() -> Result<Vec<SmbMount>, String> {
    mounts()
}

// The disk shares a host exposes (via macOS `smbutil view`). Works only after a prior sign-in
// (Keychain-backed); errors otherwise so the UI can fall back to manual share entry.
#[tauri::command]
pub fn smb_shares(host: String) -> Result<Vec<SmbShare>, String> {
    shares(&host)
}

// Ask macOS to connect to a share via its native credential UI (Finder owns auth + Keychain). No
// password crosses this boundary, so it cannot leak through IPC or logs.
#[tauri::command]
pub fn smb_connect(host: String, share: String) -> Result<String, String> {
    connect(&host, &share)
}

// The local mount path for a saved location, or null when it isn't mounted yet (the caller then
// calls `smb_connect` and polls this until macOS finishes mounting).
#[tauri::command]
pub fn smb_mount_point(host: String, share: String) -> Result<Option<String>, String> {
    mount_point(&host, &share)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_source_with_user() {
        // The form macOS reports for an authenticated mount.
        assert_eq!(
            source_host_share("//sito@192.168.1.98/Users"),
            Some(("192.168.1.98", "Users"))
        );
    }

    #[test]
    fn parses_source_without_user() {
        assert_eq!(
            source_host_share("//192.168.1.98/Shared"),
            Some(("192.168.1.98", "Shared"))
        );
    }

    #[test]
    fn drops_deeper_segments_and_rejects_malformed() {
        assert_eq!(
            source_host_share("//host/share/sub"),
            Some(("host", "share"))
        );
        assert_eq!(source_host_share("//host"), None);
        assert_eq!(source_host_share("//host/"), None);
    }

    #[test]
    fn builds_url_and_rejects_share_paths() {
        assert_eq!(
            url("192.168.1.98", Some("My Share")).unwrap(),
            "smb://192.168.1.98/My%20Share"
        );
        assert!(url("192.168.1.98", Some("a/b")).is_err());
        assert!(url("has space", None).is_err());
    }
}
