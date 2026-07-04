//! SSH / SFTP remote-browsing backend (phase 1: read-only). See SSH_PLAN.md.
//!
//! The app is path-driven: every filesystem command takes a `path` string. A remote path is just a
//! path with the `sftp://` scheme — `sftp://<connId>/absolute/remote/path`. `resolve` splits a raw
//! path into a local or remote `Target`; the routing commands in `fs.rs` dispatch on it. The local
//! cores are never touched; this module owns everything remote.
//!
//! `<connId>` refers to a saved connection (host/user/auth) rather than embedding `user@host:port`
//! in every path, so paths stay stable across edits.

use std::collections::HashMap;
use std::future::Future;
use std::path::{Path, PathBuf};
use std::pin::Pin;
use std::sync::{Arc, OnceLock};

use russh::client;
use russh::client::KeyboardInteractiveAuthResponse;
use russh::keys::agent::client::AgentClient;
use russh::keys::agent::AgentIdentity;
use russh::keys::ssh_key::{self, HashAlg};
use russh::keys::{load_secret_key, PrivateKeyWithHashAlg};
use russh_sftp::client::SftpSession;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use tokio::sync::Mutex;

use super::fs::{remote_dir_entry, DirEntry};

// Path scheme that marks a remote path. Mirrors SFTP_SCHEME on the frontend (constants.ts).
pub const SFTP_SCHEME: &str = "sftp://";
// Connections live next to settings.toml / sidebar.toml in the app config dir.
const CONNECTIONS_FILE: &str = "connections.toml";
// Default SSH port when a connection omits one.
const SSH_DEFAULT_PORT: u16 = 22;
// Phase-1 fallbacks for secrets a connection doesn't inline (keeps them out of the toml during
// development). Phase 2 replaces all of these with the OS keychain.
const PASSWORD_ENV: &str = "SFB_SSH_PASSWORD";
const KEY_PASSPHRASE_ENV: &str = "SFB_SSH_KEY_PASSPHRASE";
// Private keys tried (in order) when a connection doesn't name one — mirrors what `ssh` looks for.
const DEFAULT_KEY_NAMES: &[&str] = &["id_ed25519", "id_ecdsa", "id_rsa"];
// Error prefix marking an authentication failure (vs network/other), so the frontend can prompt for
// credentials. Mirrored as SSH_AUTH_FAILED in the frontend (constants.ts).
const AUTH_FAILED_MARKER: &str = "SSH_AUTH_FAILED";

// OS keychain for connection secrets (macOS Keychain). Keyed by "<connId>:<field>" under one
// service. On non-macOS the keyring backend isn't compiled in, so these no-op and secrets fall back
// to plaintext toml / env (phase-1 behaviour). See SSH_PLAN.md.
const KEYCHAIN_SERVICE: &str = "sito-file-browser-sftp";
const FIELD_PASSWORD: &str = "password";
const FIELD_KEY_PASSPHRASE: &str = "key-passphrase";

#[cfg(target_os = "macos")]
mod keychain {
    use keyring::Entry;

    fn entry(id: &str, field: &str) -> Result<Entry, String> {
        Entry::new(super::KEYCHAIN_SERVICE, &format!("{id}:{field}")).map_err(|e| e.to_string())
    }
    pub fn get(id: &str, field: &str) -> Option<String> {
        entry(id, field).ok()?.get_password().ok()
    }
    pub fn set(id: &str, field: &str, secret: &str) -> Result<(), String> {
        entry(id, field)?.set_password(secret).map_err(|e| e.to_string())
    }
    // Best-effort clear (used when a field is left empty); a missing entry is fine.
    pub fn delete(id: &str, field: &str) {
        if let Ok(entry) = entry(id, field) {
            let _ = entry.delete_credential();
        }
    }
}

#[cfg(not(target_os = "macos"))]
mod keychain {
    pub fn get(_id: &str, _field: &str) -> Option<String> {
        None
    }
    pub fn set(_id: &str, _field: &str, _secret: &str) -> Result<(), String> {
        Ok(())
    }
    pub fn delete(_id: &str, _field: &str) {}
}

// A saved SSH connection. Phase 1 keeps an optional inline `password` purely for local testing;
// phase 2 moves secrets to the OS keychain and drops it from this struct. `password` round-trips
// through connections.toml but is stripped before reaching the frontend (see ConnectionInfo).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Connection {
    pub id: String,
    pub name: String,
    pub host: String,
    #[serde(default = "default_port")]
    pub port: u16,
    pub user: String,
    // Auth (all optional). With none set, the default `~/.ssh/id_*` keys are tried — like `ssh`.
    // `keyPath` picks a specific private key (may start with `~/`); `keyPassphrase` unlocks it.
    // `password` enables password / keyboard-interactive auth. Secrets round-trip through
    // connections.toml but are stripped before reaching the frontend (see ConnectionInfo).
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub key_passphrase: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub password: Option<String>,
}

fn default_port() -> u16 {
    SSH_DEFAULT_PORT
}

// The non-secret view of a connection sent to the frontend (no password). Backs the sidebar rows.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionInfo {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub user: String,
}

impl From<Connection> for ConnectionInfo {
    fn from(c: Connection) -> Self {
        ConnectionInfo { id: c.id, name: c.name, host: c.host, port: c.port, user: c.user }
    }
}

// The `connections.toml` shape: an array of `[[connection]]` tables.
#[derive(Debug, Default, Serialize, Deserialize)]
struct ConnectionsFile {
    #[serde(default)]
    connection: Vec<Connection>,
}

// Read the saved connections from a config dir. A missing file is not an error — it just means no
// connections yet. Shared by the GUI (via AppHandle) and the `sfb` CLI (which resolves its own dir).
pub fn load_connections_from(config_dir: &Path) -> Vec<Connection> {
    let Ok(text) = std::fs::read_to_string(config_dir.join(CONNECTIONS_FILE)) else {
        return Vec::new();
    };
    toml::from_str::<ConnectionsFile>(&text)
        .map(|file| file.connection)
        .unwrap_or_default()
}

// Read the saved connections from the app config dir (GUI path).
pub fn load_connections(app: &AppHandle) -> Vec<Connection> {
    match app.path().app_config_dir() {
        Ok(dir) => load_connections_from(&dir),
        Err(_) => Vec::new(),
    }
}

// Persist the given connection list to connections.toml, creating the dir/file if missing.
fn write_connections(config_dir: &Path, list: Vec<Connection>) -> Result<(), String> {
    let file = ConnectionsFile { connection: list };
    let text = toml::to_string_pretty(&file).map_err(|e| e.to_string())?;
    std::fs::create_dir_all(config_dir).map_err(|e| e.to_string())?;
    std::fs::write(config_dir.join(CONNECTIONS_FILE), text).map_err(|e| e.to_string())
}

// Insert or replace (by id) a connection and persist. Lets the `sfb` CLI provision connections
// headlessly (so an agent can set one up without the GUI). Returns whether it replaced an existing.
pub fn add_connection_to(config_dir: &Path, conn: Connection) -> Result<bool, String> {
    let mut list = load_connections_from(config_dir);
    let replaced = list.iter().any(|c| c.id == conn.id);
    list.retain(|c| c.id != conn.id);
    list.push(conn);
    write_connections(config_dir, list)?;
    Ok(replaced)
}

// Remove a connection by id and persist. Returns whether one was actually removed.
pub fn remove_connection_from(config_dir: &Path, id: &str) -> Result<bool, String> {
    let mut list = load_connections_from(config_dir);
    let before = list.len();
    list.retain(|c| c.id != id);
    let removed = list.len() != before;
    write_connections(config_dir, list)?;
    Ok(removed)
}

// A live SSH connection plus its SFTP session. The client handle must be kept alive for the session
// to stay open, so it's held here even though it's not accessed directly.
struct RemoteSession {
    _handle: client::Handle<ClientHandler>,
    sftp: SftpSession,
}

// One SFTP session per connection id, reused across commands (lazy-connect on first use).
type Pool = Mutex<HashMap<String, Arc<RemoteSession>>>;

fn pool() -> &'static Pool {
    static POOL: OnceLock<Pool> = OnceLock::new();
    POOL.get_or_init(|| Mutex::new(HashMap::new()))
}

// A per-connection async lock guarding the connect. Concurrent first-time reads for the same host
// (React StrictMode's double effect in dev, or two tabs opening it at once) would otherwise each
// open a separate SSH session; the lock makes the first connect and the rest reuse it.
fn connect_locks() -> &'static Mutex<HashMap<String, Arc<Mutex<()>>>> {
    static LOCKS: OnceLock<Mutex<HashMap<String, Arc<Mutex<()>>>>> = OnceLock::new();
    LOCKS.get_or_init(|| Mutex::new(HashMap::new()))
}

// russh client handler. Verifies the server's host key against ~/.ssh/known_hosts (the same file
// `ssh` uses) with trust-on-first-use: a known host must match, a new host is recorded and accepted,
// and a CHANGED key is rejected (possible MITM). Carries host/port since check_server_key only gets
// the key.
struct ClientHandler {
    host: String,
    port: u16,
}

impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        server_public_key: &ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        match russh::keys::known_hosts::check_known_hosts(&self.host, self.port, server_public_key) {
            // Known host, key matches.
            Ok(true) => Ok(true),
            // Unknown host — trust on first use and record it (like ssh's accept-new).
            Ok(false) => {
                eprintln!(
                    "[sftp] new host {}:{} — recording its key in known_hosts",
                    self.host, self.port
                );
                russh::keys::known_hosts::learn_known_hosts(&self.host, self.port, server_public_key).ok();
                Ok(true)
            }
            // Recorded key changed → refuse (possible man-in-the-middle).
            Err(russh::keys::Error::KeyChanged { line }) => {
                eprintln!(
                    "[sftp] HOST KEY CHANGED for {}:{} (known_hosts line {line}) — refusing to \
                     connect (possible MITM). If the server was legitimately rebuilt, remove the \
                     old line from ~/.ssh/known_hosts.",
                    self.host, self.port
                );
                Ok(false)
            }
            // No known_hosts file yet / parse error → treat as first use and record.
            Err(other) => {
                eprintln!("[sftp] known_hosts check for {}:{}: {other} — recording key", self.host, self.port);
                russh::keys::known_hosts::learn_known_hosts(&self.host, self.port, server_public_key).ok();
                Ok(true)
            }
        }
    }
}

// Expand a leading `~/` to $HOME in a key path.
fn expand_home(path: &str) -> PathBuf {
    match (path.strip_prefix("~/"), std::env::var("HOME").ok()) {
        (Some(rest), Some(home)) => PathBuf::from(home).join(rest),
        _ => PathBuf::from(path),
    }
}

// The private keys to try, in order: the connection's explicit `keyPath` if set, else the common
// ~/.ssh/id_* defaults (mirrors what `ssh` probes).
fn candidate_keys(conn: &Connection) -> Vec<PathBuf> {
    if let Some(path) = &conn.key_path {
        return vec![expand_home(path)];
    }
    match std::env::var("HOME").ok() {
        Some(home) => DEFAULT_KEY_NAMES
            .iter()
            .map(|name| PathBuf::from(&home).join(".ssh").join(name))
            .collect(),
        None => Vec::new(),
    }
}

// Attempt auth via the running ssh-agent (SSH_AUTH_SOCK). This is how most people use keys —
// especially passphrase-protected ones the agent already holds unlocked — so it matches what plain
// `ssh` does. Returns Ok(false) (not an error) when there's no agent or it holds nothing useful.
async fn try_agent_auth(
    handle: &mut client::Handle<ClientHandler>,
    user: &str,
) -> Result<bool, String> {
    let mut agent = match AgentClient::connect_env().await {
        Ok(agent) => agent,
        Err(e) => {
            eprintln!("[sftp] no ssh-agent available: {e}");
            return Ok(false);
        }
    };
    let identities = agent
        .request_identities()
        .await
        .map_err(|e| format!("agent identities error: {e}"))?;
    eprintln!("[sftp] ssh-agent holds {} identit(ies)", identities.len());

    for identity in identities {
        let AgentIdentity::PublicKey { key, comment } = identity else {
            continue; // certificates not handled in phase 1
        };
        eprintln!("[sftp] trying agent key ({comment})");
        for hash in [None, Some(HashAlg::Sha512), Some(HashAlg::Sha256)] {
            let result = handle
                .authenticate_publickey_with(user, key.clone(), hash, &mut agent)
                .await
                .map_err(|e| format!("agent auth error: {e}"))?;
            if result.success() {
                return Ok(true);
            }
        }
    }
    Ok(false)
}

// Attempt public-key auth with one private key. RSA keys need an explicit signature hash, so try
// the modern algorithms in turn (ed25519/ecdsa ignore the hash and succeed on the first pass).
// Returns Ok(true) if the server accepted the key, Ok(false) if it rejected it, Err if the key
// itself couldn't be loaded (bad passphrase / unsupported format).
async fn try_key_auth(
    handle: &mut client::Handle<ClientHandler>,
    user: &str,
    key_path: &Path,
    passphrase: Option<&str>,
) -> Result<bool, String> {
    let key = load_secret_key(key_path, passphrase).map_err(|e| e.to_string())?;
    let key = Arc::new(key);
    for hash in [None, Some(HashAlg::Sha512), Some(HashAlg::Sha256)] {
        let result = handle
            .authenticate_publickey(user, PrivateKeyWithHashAlg::new(key.clone(), hash))
            .await
            .map_err(|e| format!("publickey auth error: {e}"))?;
        if result.success() {
            return Ok(true);
        }
    }
    Ok(false)
}

// Attempt password auth, then keyboard-interactive (PAM) with the same password answering every
// prompt — servers with `PasswordAuthentication no` but keyboard-interactive on need the latter.
async fn try_password_auth(
    handle: &mut client::Handle<ClientHandler>,
    user: &str,
    password: &str,
) -> Result<bool, String> {
    let ok = handle
        .authenticate_password(user, password.to_string())
        .await
        .map_err(|e| format!("auth error: {e}"))?
        .success();
    if ok {
        return Ok(true);
    }

    eprintln!("[sftp] 'password' method refused, trying keyboard-interactive…");
    let mut response = handle
        .authenticate_keyboard_interactive_start(user, None)
        .await
        .map_err(|e| format!("auth error: {e}"))?;
    loop {
        match response {
            KeyboardInteractiveAuthResponse::Success => return Ok(true),
            KeyboardInteractiveAuthResponse::Failure { .. } => return Ok(false),
            KeyboardInteractiveAuthResponse::InfoRequest { prompts, .. } => {
                let answers = vec![password.to_string(); prompts.len()];
                response = handle
                    .authenticate_keyboard_interactive_respond(answers)
                    .await
                    .map_err(|e| format!("auth error: {e}"))?;
            }
        }
    }
}

// Open a fresh SSH connection, authenticate (key first, then password), and start an SFTP session.
// Logs each step to stderr (visible in the `tauri dev` terminal) so connection problems are
// diagnosable — remote failures otherwise surface only as an empty folder.
async fn open_session(conn: &Connection) -> Result<RemoteSession, String> {
    eprintln!("[sftp] connecting to {}@{}:{}", conn.user, conn.host, conn.port);
    let config = Arc::new(client::Config::default());
    let handler = ClientHandler { host: conn.host.clone(), port: conn.port };
    let mut handle = client::connect(config, (conn.host.as_str(), conn.port), handler)
        .await
        .map_err(|e| {
            eprintln!("[sftp] connect failed: {e}");
            format!("connect failed: {e}")
        })?;
    eprintln!("[sftp] tcp/ssh handshake ok, authenticating…");

    // 0) ssh-agent — how keys are normally used (esp. encrypted ones the agent holds unlocked).
    //    Matches plain `ssh`. Skipped silently if there's no agent.
    eprintln!("[sftp] trying ssh-agent…");
    let mut authed = try_agent_auth(&mut handle, &conn.user).await?;
    if authed {
        eprintln!("[sftp] authenticated via ssh-agent");
    }

    // 1) Public-key auth from disk — the connection's named key, or the common ~/.ssh/id_* keys.
    //    Only if the agent didn't already authenticate. Needs a passphrase for encrypted keys.
    if !authed {
        // Secret resolution order everywhere: OS keychain → inline toml → env var.
        let passphrase = keychain::get(&conn.id, FIELD_KEY_PASSPHRASE)
            .or_else(|| conn.key_passphrase.clone())
            .or_else(|| std::env::var(KEY_PASSPHRASE_ENV).ok());
        for key_path in candidate_keys(conn) {
            if !key_path.exists() {
                continue;
            }
            eprintln!("[sftp] trying key {}", key_path.display());
            match try_key_auth(&mut handle, &conn.user, &key_path, passphrase.as_deref()).await {
                Ok(true) => {
                    eprintln!("[sftp] authenticated with key {}", key_path.display());
                    authed = true;
                    break;
                }
                Ok(false) => eprintln!("[sftp] key {} rejected by server", key_path.display()),
                // A key that won't load (encrypted w/o passphrase, bad format) shouldn't abort the rest.
                Err(e) => eprintln!("[sftp] key {} unusable: {e}", key_path.display()),
            }
        }
    }

    // 2) Password / keyboard-interactive — only if a password is configured and keys didn't work.
    if !authed {
        if let Some(password) = keychain::get(&conn.id, FIELD_PASSWORD)
            .or_else(|| conn.password.clone())
            .or_else(|| std::env::var(PASSWORD_ENV).ok())
        {
            eprintln!("[sftp] trying password / keyboard-interactive…");
            authed = try_password_auth(&mut handle, &conn.user, &password).await?;
        }
    }

    if !authed {
        eprintln!(
            "[sftp] authentication REJECTED for {}@{} — no key accepted{}. Check that your \
             public key is in the server's ~/.ssh/authorized_keys, or set a keyPath/password.",
            conn.user,
            conn.host,
            if conn.password.is_some() { " and password rejected" } else { " (no password set)" }
        );
        // Prefixed with a stable marker so the frontend can recognise an auth failure (vs a network
        // error) and prompt for a password/passphrase instead of showing a generic toast.
        return Err(format!(
            "{AUTH_FAILED_MARKER}: authentication failed for {}@{}",
            conn.user, conn.host
        ));
    }
    eprintln!("[sftp] authenticated, opening sftp subsystem…");

    let channel = handle
        .channel_open_session()
        .await
        .map_err(|e| {
            eprintln!("[sftp] channel error: {e}");
            format!("channel error: {e}")
        })?;
    channel
        .request_subsystem(true, "sftp")
        .await
        .map_err(|e| {
            eprintln!("[sftp] sftp subsystem error: {e}");
            format!("sftp subsystem error: {e}")
        })?;
    let sftp = SftpSession::new(channel.into_stream())
        .await
        .map_err(|e| {
            eprintln!("[sftp] sftp init error: {e}");
            format!("sftp init error: {e}")
        })?;
    eprintln!("[sftp] session ready for '{}'", conn.id);

    Ok(RemoteSession { _handle: handle, sftp })
}

// Get the pooled session for `conn_id`, connecting (and caching) on first use. Concurrent callers
// for the same connection share one connect via a per-connection lock (double-checked against the
// pool), so a burst of simultaneous reads opens exactly one SSH session.
async fn session_for(app: &AppHandle, conn_id: &str) -> Result<Arc<RemoteSession>, String> {
    // Fast path: already connected.
    if let Some(session) = pool().lock().await.get(conn_id) {
        eprintln!("[sftp] reusing pooled session for '{conn_id}'");
        return Ok(session.clone());
    }

    // Serialize connects for this connection id (short global lock just to fetch/create its guard).
    let guard = {
        let mut locks = connect_locks().lock().await;
        locks.entry(conn_id.to_string()).or_insert_with(|| Arc::new(Mutex::new(()))).clone()
    };
    let _connecting = guard.lock().await;

    // Re-check: another task may have connected while we waited on the guard.
    if let Some(session) = pool().lock().await.get(conn_id) {
        eprintln!("[sftp] reusing session opened by a concurrent read for '{conn_id}'");
        return Ok(session.clone());
    }

    let conn = load_connections(app)
        .into_iter()
        .find(|c| c.id == conn_id)
        .ok_or_else(|| {
            eprintln!("[sftp] unknown connection '{conn_id}' (not in connections.toml)");
            format!("unknown connection '{conn_id}'")
        })?;
    let session = Arc::new(open_session(&conn).await?);
    pool().lock().await.insert(conn_id.to_string(), session.clone());
    Ok(session)
}

// Where a path points: the local filesystem, or a remote host's absolute path.
pub enum Target {
    Local(String),
    Remote { conn: String, path: String },
}

// Split a raw path into a local or remote target. `sftp://<conn>/abs/path` → Remote; the remote
// path keeps its leading slash (defaulting to "/" when only the connection is given).
pub fn resolve(raw: &str) -> Target {
    match raw.strip_prefix(SFTP_SCHEME) {
        Some(rest) => {
            let (conn, path) = match rest.find('/') {
                Some(i) => (&rest[..i], &rest[i..]),
                None => (rest, "/"),
            };
            let path = if path.is_empty() { "/" } else { path };
            Target::Remote { conn: conn.to_string(), path: path.to_string() }
        }
        None => Target::Local(raw.to_string()),
    }
}

// Re-assemble the `sftp://<conn>/path` URL the frontend uses to navigate/refetch a remote entry.
fn remote_url(conn: &str, path: &str) -> String {
    let sep = if path.starts_with('/') { "" } else { "/" };
    format!("{SFTP_SCHEME}{conn}{sep}{path}")
}

// List a remote directory over SFTP, mapping each entry to the app's DirEntry model.
pub async fn read_dir(app: &AppHandle, conn: &str, path: &str) -> Result<Vec<DirEntry>, String> {
    eprintln!("[sftp] read_dir '{conn}':{path}");
    let session = session_for(app, conn).await?;
    let entries = session
        .sftp
        .read_dir(path)
        .await
        .map_err(|e| {
            eprintln!("[sftp] read_dir failed for '{conn}':{path}: {e}");
            format!("read_dir failed: {e}")
        })?;

    let base = path.trim_end_matches('/');
    let mut result = Vec::new();
    for entry in entries {
        let name = entry.file_name();
        let meta = entry.metadata();
        let child = format!("{base}/{name}");
        result.push(remote_dir_entry(
            name,
            remote_url(conn, &child),
            meta.size.unwrap_or(0),
            entry.file_type().is_dir(),
            meta.mtime.unwrap_or(0) as u64,
            meta.atime.unwrap_or(0) as u64,
        ));
    }
    eprintln!("[sftp] read_dir '{conn}':{path} → {} entries", result.len());
    Ok(result)
}

// Metadata for a single remote entry.
pub async fn stat(app: &AppHandle, conn: &str, path: &str) -> Result<DirEntry, String> {
    let session = session_for(app, conn).await?;
    let meta = session
        .sftp
        .metadata(path)
        .await
        .map_err(|e| format!("stat failed: {e}"))?;
    let name = path
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or(path)
        .to_string();
    Ok(remote_dir_entry(
        name,
        remote_url(conn, path),
        meta.size.unwrap_or(0),
        meta.is_dir(),
        meta.mtime.unwrap_or(0) as u64,
        meta.atime.unwrap_or(0) as u64,
    ))
}

// Local cache path a remote file downloads to: `<cache>/sftp/<conn>/<remote path>`. Cleared by the
// Storage settings "Clear cache" button (it wipes the whole cache dir).
fn cache_path_for(app: &AppHandle, conn: &str, path: &str) -> Result<std::path::PathBuf, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    Ok(cache.join("sftp").join(conn).join(path.trim_start_matches('/')))
}

// Download a remote file to the local cache and return its local path, so the existing local open /
// preview paths can use it. Read-only: edits to the local copy are NOT pushed back (phase 3a). If a
// cached copy already matches the remote size it's reused (no re-download); a size mismatch (the
// remote changed) re-downloads. See SSH_PLAN.md.
pub async fn download(app: &AppHandle, conn: &str, path: &str) -> Result<String, String> {
    let session = session_for(app, conn).await?;
    let local = cache_path_for(app, conn, path)?;

    let remote_size = session
        .sftp
        .metadata(path)
        .await
        .map_err(|e| format!("stat failed: {e}"))?
        .size
        .unwrap_or(0);
    if let Ok(meta) = std::fs::metadata(&local) {
        if meta.len() == remote_size {
            eprintln!("[sftp] cache hit for '{conn}':{path}");
            return Ok(local.to_string_lossy().into_owned());
        }
    }

    eprintln!("[sftp] downloading '{conn}':{path} ({remote_size} bytes)");
    let bytes = session
        .sftp
        .read(path)
        .await
        .map_err(|e| format!("download failed: {e}"))?;
    if let Some(parent) = local.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&local, bytes).map_err(|e| e.to_string())?;
    Ok(local.to_string_lossy().into_owned())
}

// Download a remote file to the cache; returns the local path to open/preview. See `download`.
#[tauri::command]
pub async fn sftp_download(app: AppHandle, conn: String, path: String) -> Result<String, String> {
    download(&app, &conn, &path).await
}

// The connection's login directory as a `sftp://<conn>/home` URL — where `ssh` drops you. SFTP's
// "." canonicalizes to the login dir, so opening a connection lands on the user's home (e.g.
// /root) instead of the filesystem root, matching the shell.
pub async fn home_url(app: &AppHandle, conn: &str) -> Result<String, String> {
    let session = session_for(app, conn).await?;
    let home = session
        .sftp
        .canonicalize(".")
        .await
        .map_err(|e| {
            eprintln!("[sftp] home lookup failed for '{conn}': {e}");
            format!("home lookup failed: {e}")
        })?;
    eprintln!("[sftp] home for '{conn}' = {home}");
    Ok(remote_url(conn, &home))
}

// Resolve a connection's home directory (see home_url). Called when a connection is opened so the
// first view is the login dir, like `ssh`.
#[tauri::command]
pub async fn sftp_home(app: AppHandle, conn: String) -> Result<String, String> {
    home_url(&app, &conn).await
}

// Create a uniquely-named "untitled folder" under a remote parent; returns its sftp:// URL (so the
// frontend can start an inline rename), mirroring the local create_folder behaviour.
pub async fn create_dir(app: &AppHandle, conn: &str, parent: &str) -> Result<String, String> {
    let session = session_for(app, conn).await?;
    let base = parent.trim_end_matches('/');
    let mut name = "untitled folder".to_string();
    let mut i = 2;
    loop {
        let candidate = format!("{base}/{name}");
        // metadata error ⇒ nothing there ⇒ free name.
        if session.sftp.metadata(&candidate).await.is_err() {
            session
                .sftp
                .create_dir(candidate.clone())
                .await
                .map_err(|e| format!("mkdir failed: {e}"))?;
            return Ok(remote_url(conn, &candidate));
        }
        name = format!("untitled folder {i}");
        i += 1;
    }
}

// Rename a remote entry in place within its parent.
pub async fn rename(app: &AppHandle, conn: &str, path: &str, new_name: &str) -> Result<(), String> {
    let session = session_for(app, conn).await?;
    let parent = path.trim_end_matches('/').rsplit_once('/').map_or("", |(p, _)| p);
    let dest = format!("{parent}/{new_name}");
    if session.sftp.metadata(&dest).await.is_ok() {
        return Err("An item with that name already exists".to_string());
    }
    session
        .sftp
        .rename(path.to_string(), dest)
        .await
        .map_err(|e| format!("rename failed: {e}"))
}

// Permanently remove a remote entry (SFTP has no trash). Directories are cleared recursively:
// gather the tree, delete files, then remove directories deepest-first.
pub async fn remove(app: &AppHandle, conn: &str, path: &str) -> Result<(), String> {
    let session = session_for(app, conn).await?;
    let meta = session
        .sftp
        .metadata(path)
        .await
        .map_err(|e| format!("stat failed: {e}"))?;

    if !meta.is_dir() {
        return session
            .sftp
            .remove_file(path.to_string())
            .await
            .map_err(|e| format!("delete failed: {e}"));
    }

    // DFS: discover dirs (parents before children), removing files as we go.
    let mut discovered: Vec<String> = Vec::new();
    let mut stack = vec![path.to_string()];
    while let Some(dir) = stack.pop() {
        for entry in session
            .sftp
            .read_dir(&dir)
            .await
            .map_err(|e| format!("read_dir failed: {e}"))?
        {
            let child = format!("{}/{}", dir.trim_end_matches('/'), entry.file_name());
            if entry.file_type().is_dir() {
                stack.push(child);
            } else {
                session
                    .sftp
                    .remove_file(child)
                    .await
                    .map_err(|e| format!("delete failed: {e}"))?;
            }
        }
        discovered.push(dir);
    }
    // Deepest-first: children were discovered after their parents, so reverse.
    for dir in discovered.into_iter().rev() {
        session
            .sftp
            .remove_dir(dir)
            .await
            .map_err(|e| format!("delete failed: {e}"))?;
    }
    Ok(())
}

// ── Transfers across the local/remote boundary (SSH_PLAN.md phase 3c) ──────────────────────────
// A boxed future alias so the recursive tree walkers below can call themselves (async fns can't
// recurse directly).
type Transfer<'a> = Pin<Box<dyn Future<Output = Result<(), String>> + Send + 'a>>;

// Last path segment of a local or sftp path.
fn base_name(path: &str) -> String {
    path.trim_end_matches('/').rsplit('/').next().unwrap_or(path).to_string()
}

// Split "name.ext" into ("name", ".ext"); no extension → (name, ""). Used for collision renames.
fn split_name(name: &str) -> (&str, &str) {
    match name.rfind('.') {
        Some(i) if i > 0 => (&name[..i], &name[i..]),
        _ => (name, ""),
    }
}

// True if either endpoint is remote — i.e. the transfer must go through SFTP, not the local core.
pub fn involves_remote(source: &str, dest_dir: &str) -> bool {
    matches!(resolve(source), Target::Remote { .. })
        || matches!(resolve(dest_dir), Target::Remote { .. })
}

// A non-colliding destination path under a remote dir, appending " (n)" before the extension.
async fn unique_remote(session: &RemoteSession, dir: &str, name: &str) -> Result<String, String> {
    let base = dir.trim_end_matches('/');
    let (stem, ext) = split_name(name);
    let mut candidate = format!("{base}/{name}");
    let mut i = 1;
    while session.sftp.metadata(&candidate).await.is_ok() {
        i += 1;
        candidate = format!("{base}/{stem} ({i}){ext}");
    }
    Ok(candidate)
}

// A non-colliding destination path under a local dir (same scheme as unique_remote).
fn unique_local(dir: &str, name: &str) -> PathBuf {
    let base = Path::new(dir);
    let (stem, ext) = split_name(name);
    let mut candidate = base.join(name);
    let mut i = 1;
    while candidate.exists() {
        i += 1;
        candidate = base.join(format!("{stem} ({i}){ext}"));
    }
    candidate
}

// Write bytes to a remote path, creating/truncating the file. russh-sftp's `write` opens with only
// WRITE (no CREATE), so it fails with "no such file" on a new upload — `create` opens CREATE|TRUNC.
async fn write_remote(session: &RemoteSession, path: String, bytes: &[u8]) -> Result<(), String> {
    use tokio::io::AsyncWriteExt;
    let mut file = session
        .sftp
        .create(path)
        .await
        .map_err(|e| format!("create failed: {e}"))?;
    file.write_all(bytes).await.map_err(|e| format!("write failed: {e}"))?;
    file.flush().await.map_err(|e| format!("flush failed: {e}"))?;
    file.shutdown().await.ok();
    Ok(())
}

// Upload a local file/dir tree to a remote destination path.
fn upload<'a>(session: &'a RemoteSession, local: PathBuf, remote: String) -> Transfer<'a> {
    Box::pin(async move {
        let meta = std::fs::metadata(&local).map_err(|e| e.to_string())?;
        if meta.is_dir() {
            session
                .sftp
                .create_dir(remote.clone())
                .await
                .map_err(|e| format!("mkdir failed: {e}"))?;
            for entry in std::fs::read_dir(&local).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                let child = format!("{}/{}", remote.trim_end_matches('/'), entry.file_name().to_string_lossy());
                upload(session, entry.path(), child).await?;
            }
            Ok(())
        } else {
            let bytes = std::fs::read(&local).map_err(|e| e.to_string())?;
            write_remote(session, remote, &bytes).await
        }
    })
}

// Download a remote file/dir tree to a local destination path.
fn download_tree<'a>(session: &'a RemoteSession, remote: String, local: PathBuf) -> Transfer<'a> {
    Box::pin(async move {
        let meta = session
            .sftp
            .metadata(&remote)
            .await
            .map_err(|e| format!("stat failed: {e}"))?;
        if meta.is_dir() {
            std::fs::create_dir_all(&local).map_err(|e| e.to_string())?;
            for entry in session
                .sftp
                .read_dir(&remote)
                .await
                .map_err(|e| format!("read_dir failed: {e}"))?
            {
                let child = format!("{}/{}", remote.trim_end_matches('/'), entry.file_name());
                download_tree(session, child, local.join(entry.file_name())).await?;
            }
            Ok(())
        } else {
            let bytes = session
                .sftp
                .read(&remote)
                .await
                .map_err(|e| format!("download failed: {e}"))?;
            std::fs::write(&local, bytes).map_err(|e| e.to_string())
        }
    })
}

// Copy a remote file/dir tree to another remote path (reads via `src`, writes via `dst`; they may
// be the same host). SFTP has no server-side copy, so bytes round-trip through the app.
fn remote_copy<'a>(
    src: &'a RemoteSession,
    dst: &'a RemoteSession,
    from: String,
    to: String,
) -> Transfer<'a> {
    Box::pin(async move {
        let meta = src
            .sftp
            .metadata(&from)
            .await
            .map_err(|e| format!("stat failed: {e}"))?;
        if meta.is_dir() {
            dst.sftp
                .create_dir(to.clone())
                .await
                .map_err(|e| format!("mkdir failed: {e}"))?;
            for entry in src
                .sftp
                .read_dir(&from)
                .await
                .map_err(|e| format!("read_dir failed: {e}"))?
            {
                let child_from = format!("{}/{}", from.trim_end_matches('/'), entry.file_name());
                let child_to = format!("{}/{}", to.trim_end_matches('/'), entry.file_name());
                remote_copy(src, dst, child_from, child_to).await?;
            }
            Ok(())
        } else {
            let bytes = src
                .sftp
                .read(&from)
                .await
                .map_err(|e| format!("copy read failed: {e}"))?;
            write_remote(dst, to, &bytes).await
        }
    })
}

fn remove_local(path: &str) -> Result<(), String> {
    let p = Path::new(path);
    if p.is_dir() {
        std::fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        std::fs::remove_file(p).map_err(|e| e.to_string())
    }
}

// Copy (or move, when `is_move`) `source` into `dest_dir` across the local/remote boundary. Returns
// the final destination path (a local path or a `sftp://` URL). At least one endpoint is remote —
// pure local↔local is handled by the local core in fs.rs.
pub async fn transfer(
    app: &AppHandle,
    source: &str,
    dest_dir: &str,
    is_move: bool,
) -> Result<String, String> {
    let name = base_name(source);
    match (resolve(source), resolve(dest_dir)) {
        // Local → remote: upload.
        (Target::Local(local), Target::Remote { conn, path }) => {
            let session = session_for(app, &conn).await?;
            let dest = unique_remote(&session, &path, &name).await?;
            eprintln!("[sftp] upload {local} → '{conn}':{dest}");
            upload(&session, PathBuf::from(&local), dest.clone()).await?;
            if is_move {
                remove_local(&local)?;
            }
            Ok(remote_url(&conn, &dest))
        }
        // Remote → local: download.
        (Target::Remote { conn, path }, Target::Local(local_dir)) => {
            let session = session_for(app, &conn).await?;
            let dest = unique_local(&local_dir, &name);
            eprintln!("[sftp] download '{conn}':{path} → {}", dest.display());
            download_tree(&session, path.clone(), dest.clone()).await?;
            if is_move {
                remove(app, &conn, &path).await?;
            }
            Ok(dest.to_string_lossy().into_owned())
        }
        // Remote → remote: server-side rename when moving within one host, else byte round-trip.
        (Target::Remote { conn: sc, path: sp }, Target::Remote { conn: dc, path: dp }) => {
            let src = session_for(app, &sc).await?;
            let dst = session_for(app, &dc).await?;
            let dest = unique_remote(&dst, &dp, &name).await?;
            if is_move && sc == dc {
                eprintln!("[sftp] move '{sc}':{sp} → {dest}");
                src.sftp
                    .rename(sp.clone(), dest.clone())
                    .await
                    .map_err(|e| format!("move failed: {e}"))?;
                return Ok(remote_url(&dc, &dest));
            }
            eprintln!("[sftp] copy '{sc}':{sp} → '{dc}':{dest}");
            remote_copy(&src, &dst, sp.clone(), dest.clone()).await?;
            if is_move {
                remove(app, &sc, &sp).await?;
            }
            Ok(remote_url(&dc, &dest))
        }
        (Target::Local(_), Target::Local(_)) => {
            Err("local transfer must not route through sftp".to_string())
        }
    }
}

// The saved connections, for the sidebar's Network group. Mapped to ConnectionInfo so passwords
// never cross to the frontend.
#[tauri::command]
pub fn sftp_list_connections(app: AppHandle) -> Vec<ConnectionInfo> {
    load_connections(&app).into_iter().map(ConnectionInfo::from).collect()
}

// Add (or replace by id) a connection from the GUI. Secrets go to the OS keychain — never the toml;
// connections.toml keeps only non-sensitive fields. Passing an empty/absent secret clears any
// stored one. Backs the "+" form in the sidebar's Network group (SSH_PLAN.md phase 2).
#[tauri::command]
pub fn sftp_add_connection(app: AppHandle, connection: Connection) -> Result<(), String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;

    match connection.password.as_deref().filter(|s| !s.is_empty()) {
        Some(secret) => keychain::set(&connection.id, FIELD_PASSWORD, secret)?,
        None => keychain::delete(&connection.id, FIELD_PASSWORD),
    }
    match connection.key_passphrase.as_deref().filter(|s| !s.is_empty()) {
        Some(secret) => keychain::set(&connection.id, FIELD_KEY_PASSPHRASE, secret)?,
        None => keychain::delete(&connection.id, FIELD_KEY_PASSPHRASE),
    }

    // Strip secrets before persisting — they live only in the keychain now.
    let stored = Connection {
        password: None,
        key_passphrase: None,
        ..connection
    };
    add_connection_to(&dir, stored).map(|_replaced| ())
}
