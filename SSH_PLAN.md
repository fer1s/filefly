# SSH / SFTP Remote Browsing — Implementation Plan

Status: **proposal, not implemented**. Adds remote filesystem browsing over SSH (SFTP) to the
existing local file browser. Remote connections surface as rows in the existing **Network** sidebar
group (unchanged name/id).

This document follows `ARCHITECTURE_RULES.md`: feature-sliced frontend, manager + provider access,
typed models, i18n for all user text, named constants (no magic literals), one-unit-per-file.

---

## 1. Core idea — path-based dispatch

Every backend filesystem command in `src-tauri/src/filesystem/fs.rs` (17 of them) takes a
`path: String`. That is the single seam we exploit: the app is already path-driven, so a remote path
is just a path with a special scheme.

- **Local path**: `/Users/sito8943/Documents` → handled by existing `std::fs` cores (unchanged).
- **Remote path**: `sftp://<connId>/absolute/remote/path` → routed to a new SFTP backend.

`<connId>` is the id of a saved connection (not `user@host:port` inline) — credentials live in the
connection store, so paths stay stable even if the host/port is edited.

### Router (Rust)

A single resolver decides local vs remote; the existing local cores are **not modified**, only
wrapped:

```rust
// src-tauri/src/filesystem/target.rs (new)
pub enum Target {
    Local(PathBuf),
    Remote { conn: String, path: String },
}

pub fn resolve(raw: &str) -> Target { /* split on SFTP_SCHEME */ }
```

Each `#[tauri::command]` gains a one-line branch:

```rust
#[tauri::command]
pub fn read_directory_cmd(path: String) -> Result<Vec<DirEntry>, String> {
    match target::resolve(&path) {
        Target::Local(p)         => read_directory(&p.to_string_lossy()),
        Target::Remote { conn, path } => sftp::read_dir(&conn, &path),
    }
}
```

> **Memory constraint** (`sfb CLI shares fs cores`): the router lives in the **command wrapper
> layer**, and the local cores stay untouched. The headless `sfb` CLI keeps operating on local paths
> only; making the CLI remote-aware is explicitly out of scope for this plan.

---

## 2. Backend module `src-tauri/src/sftp/` (new)

- **Crate choice**: `russh` + `russh-sftp` — pure-Rust SSH/SFTP, no libssh2 C dependency, keeps the
  Tauri cross-platform build clean. (Alternative considered: `ssh2` / libssh2 bindings — rejected to
  avoid native build friction.)
- **Session pool**: `Mutex<HashMap<ConnId, SftpSession>>`, lazy-connect on first use, reused across
  commands. Dropped/reconnected on network failure.
- **Remote cores** mirroring the local ones, mapping SFTP attributes → the existing `DirEntry` model:
  - `read_dir`, `stat`, `read`, `write`, `rename`, `mkdir`, `remove`.
- Errors normalized to the same `Result<_, String>` shape the frontend already expects.

New Tauri commands (registered in `main.rs` alongside the existing ones):
`sftp_list_connections`, `sftp_add_connection`, `sftp_edit_connection`, `sftp_remove_connection`,
`sftp_connect`, `sftp_disconnect`.

---

## 3. Connection store + secrets

### Connection model (typed, shared)

```ts
// src/features/connections/models/ (new feature folder)
export type Connection = {
  id: string;
  name: string;
  host: string;
  port: number;          // default constant SSH_DEFAULT_PORT = 22
  user: string;
  authKind: AuthKind;    // const-object enum: PASSWORD | KEY | AGENT
  keyPath?: string;      // for KEY
};
```

- **Non-secret fields** → `connections.toml` in the config dir (same dir as `settings.toml` /
  `sidebar.toml`).
- **Secrets** (password, key passphrase) → **OS keychain** via the `keyring` crate (macOS Keychain).
  Never written to `connections.toml`.
- Auth kinds: password, private-key file, ssh-agent.

### Constants (no magic literals — rule 11)

```ts
// src/features/connections/constants.ts
export const AUTH_KIND = { PASSWORD: "password", KEY: "key", AGENT: "agent" } as const;
export const SSH_DEFAULT_PORT = 22;
export const SFTP_SCHEME = "sftp://";
```

`SFTP_SCHEME` also mirrored as a Rust constant so both sides agree on the prefix.

---

## 4. Frontend feature `src/features/connections/`

Follows the feature-sliced + manager/provider rules:

```txt
features/connections/
  components/
    ConnectionDialog/        # add/edit connection form (host, user, auth)
  managers/
    ConnectionsManager.ts    # wraps api.* calls; list/add/edit/remove/connect
  providers/
    ConnectionsProvider/     # exposes manager + live connection list via hook
  models/  types.ts
  constants.ts
  index.ts
```

- `ConnectionsManager` wraps the Tauri `sftp_*` commands (via `shared/services/api.ts`), keeping IPC
  out of components (rule 4).
- `api.ts` gains typed wrappers: `sftpListConnections()`, `sftpAddConnection(c)`, etc.

### Sidebar integration (Network group, unchanged id/name)

- The Network group is already `editable: true` and today shows only the `todo` placeholder.
- Each saved connection renders as a `FolderItem`-style row in Network; click →
  `setPath("sftp://<id>/")` and the browser navigates remotely exactly like a local folder.
- The group's "Add" action opens `ConnectionDialog` (a connection form) instead of the folder picker.
- Distinct icon (server/plug) + connected/disconnected state indicator.
- i18n: new keys under `t.sidebar` / a `t.connections` namespace — no hardcoded strings (rule 9).

---

## 5. Degradations in remote mode (must be designed up front)

| Feature | Local | Remote (SFTP) |
|---|---|---|
| Live change watching | inotify via `tauri-plugin-fs` (`watch`) | **not available** → poll every N s, or manual refresh |
| Thumbnails | reads local file | partial download or disable for remote |
| Directory size (walk) | local walk | remote walk is slow → lazy / opt-in only |
| Trash / restore | local trash ledger | SFTP has no trash → direct delete behind a confirm |
| Drag-out to other apps | local path | requires downloading to a temp file first |

Each of these needs an explicit remote branch or a graceful "not supported here" state — not a crash.

---

## 6. Delivery phases

1. **Read-only browse (proof of value). — DONE (backend + minimal UI).**
   - `filesystem/sftp.rs`: connection model + `connections.toml` loader, session pool, password
     auth, `read_dir` + `stat` mapped to `DirEntry`, `resolve()` path router, `sftp_list_connections`.
   - `fs.rs`: local cores renamed (`read_directory_local`, `get_entry_local`); `read_directory` and
     `get_entry` are now async routing commands. CLI (`sfb.rs`) + `typeahead_core` call the local
     cores directly, so the headless CLI stays local-only.
   - Frontend: `features/connections/` (manager + `useConnections` hook), `SFTP_SCHEME` +
     `Connection` type, connection rows in the sidebar Network group → click navigates `sftp://<id>/`.
   - **Not yet routed** (fall through to local, so they no-op/err on remote paths): `get_dir_size`,
     `get_thumbnail`, `open_file`, all write commands. That's phases 2–3.

   ### Testing phase 1
   Create `connections.toml` in the app config dir
   (`~/Library/Application Support/com.sito8943.file-browser/`):
   ```toml
   [[connection]]
   id = "myserver"
   name = "My Server"
   host = "example.com"
   port = 22
   user = "sito"
   # Phase 1 only — inline password OR export SFB_SSH_PASSWORD before launching. Phase 2 → keychain.
   password = "secret"
   ```
   …or provision it headlessly with the `sfb` CLI (no GUI needed — an agent can do this in parallel):
   ```sh
   sfb sftp-add --id myserver --name "My Server" --host example.com --user sito --port 22 --password secret
   sfb sftp-list                 # non-secret view (passwords omitted)
   sfb sftp-remove --id myserver
   ```
   The CLI writes the same `connections.toml` the GUI reads (shared core `sftp::*_connection*`,
   config dir resolved by the CLI's own `app_config_dir()` mirroring the Tauri identifier).

   Launch the app → the connection shows under **Network** → click it → the directory view lists the
   remote home over SFTP. Host key is trusted blindly for now (phase-4 hardening).

   Original phase-1 scope, for reference: `sftp` module (`read_dir`, `stat`, `read`) + router on the
   read commands (`read_directory`, `get_entry`, open/download).
2. **Connection management.** `connections.toml` + `keyring` secrets + `connections` feature +
   `ConnectionDialog` + Network-group rows. Outcome: users add/connect their own hosts.
3. **Write operations.** Router on `move_entry`, `copy_entry`, `rename_entry`, `create_folder`,
   `delete_entry`. Upload/download between local and remote. Confirm-on-delete (no trash).
4. **Polish.** Poll-based refresh, opt-in remote sizes, reconnect on dropped session, clear network
   error surfaces.

---

## 7. Main risk — audit every `fs.*` caller

`fs.rs` is the obvious surface, but the **frontend** also has code paths that assume a local path
(thumbnail requests, drag/drop, path bar, breadcrumb splitting on `/`, trash actions). Before
phase 1 lands, audit every `api.*` filesystem call and confirm each either goes through the router
or has a remote-aware branch. A path that silently falls through to `std::fs` on a `sftp://` string
is the primary failure mode.

---

## 8. Estimate

Weeks, not a day. The mechanical part (wrapping 17 commands) is small; the real cost is the SFTP
backend, credential/keychain handling, the connection UI, and making every local-path assumption in
the frontend remote-safe.
