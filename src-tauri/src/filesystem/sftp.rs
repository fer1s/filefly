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
use std::path::{Path, PathBuf};
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

// russh client handler. Phase 1 trusts any host key (no known-hosts verification yet — phase 4
// hardening). Everything else uses russh defaults.
struct ClientHandler;

impl client::Handler for ClientHandler {
    type Error = russh::Error;

    async fn check_server_key(
        &mut self,
        _server_public_key: &ssh_key::PublicKey,
    ) -> Result<bool, Self::Error> {
        Ok(true)
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
    let mut handle = client::connect(config, (conn.host.as_str(), conn.port), ClientHandler)
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
        return Err(format!("authentication failed for {}@{}", conn.user, conn.host));
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
