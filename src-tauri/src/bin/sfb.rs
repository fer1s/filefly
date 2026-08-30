//! `sfb` — a headless, AI-friendly CLI over the file browser's operations.
//!
//! It links the app's library crate and calls the very same `filesystem` cores the GUI does, so
//! there is one source of truth for how files are listed, copied, and trashed. Everything is
//! machine-oriented: named `--flags` in, a JSON envelope out, deterministic exit codes.
//!
//!   { "ok": true,  "data": <result> }   → exit 0
//!   { "ok": false, "error": "<msg>" }   → exit 1
//!
//! An agent discovers the full surface without docs via `sfb api-resources`, `sfb explain`, or
//! `sfb schema`. The execution table and its resource-operation map are declarative; every legacy
//! command has exactly one canonical `verb + resource` form and both call the same closure.

use std::collections::{BTreeMap, HashMap};
use std::path::{Component, Path, PathBuf};
use std::process::exit;

use serde_json::{json, Value};

use sito_file_browser_lib::filesystem::{archive, fs, sftp, smb, tags};
use sito_file_browser_lib::functions::sidebar;

// ---- Command table (declarative registry) ----------------------------------------------------

// One CLI argument. `takes_value = false` marks a boolean flag (present or absent, no value).
struct ArgSpec {
    name: &'static str,
    required: bool,
    takes_value: bool,
    description: &'static str,
}

// One legacy CLI command/executor. `run` receives the parsed args and returns the JSON payload (or
// an error string that becomes the `error` field). `group` remains in schema for compatibility.
struct Command {
    name: &'static str,
    group: &'static str,
    summary: &'static str,
    args: &'static [ArgSpec],
    run: fn(&Parsed) -> Result<Value, String>,
}

// Canonical resource-oriented form for one existing command. `command` points back to COMMANDS,
// so both syntaxes always execute the same closure and filesystem/UI core.
struct OperationSpec {
    verb: &'static str,
    resource: &'static str,
    resource_aliases: &'static [&'static str],
    command: &'static str,
    positional_args: &'static [&'static str],
    scope: &'static str,
    destructive: bool,
    reversible: bool,
    requires_app: bool,
    platforms: &'static [&'static str],
}

// Friendly flag aliases accepted by the resource-oriented syntax and legacy commands alike.
struct ArgAlias {
    command: &'static str,
    alias: &'static str,
    canonical: &'static str,
}

// Shorthands to keep the table readable.
const fn val(name: &'static str, required: bool, description: &'static str) -> ArgSpec {
    ArgSpec {
        name,
        required,
        takes_value: true,
        description,
    }
}
const fn flag(name: &'static str, description: &'static str) -> ArgSpec {
    ArgSpec {
        name,
        required: false,
        takes_value: false,
        description,
    }
}

const COMMANDS: &[Command] = &[
    // -- Read -------------------------------------------------------------------------------
    Command {
        name: "list",
        group: "read",
        summary: "List the entries directly inside a directory.",
        args: &[val("path", true, "Directory to list.")],
        run: |a| {
            let entries = fs::read_directory_local(a.require("path")?)?;
            to_value(&entries)
        },
    },
    Command {
        name: "info",
        group: "read",
        summary: "Metadata for a single file or directory.",
        args: &[val("path", true, "Path to inspect.")],
        run: |a| {
            let entry = fs::get_entry_local(a.require("path")?.to_string())?;
            to_value(&entry)
        },
    },
    Command {
        name: "search",
        group: "read",
        summary: "Recursively find entries whose name contains a query (case-insensitive, capped).",
        args: &[
            val("path", true, "Root directory to search under."),
            val("query", true, "Substring to match in entry names."),
        ],
        run: |a| {
            let hits = fs::search_directory_core(a.require("path")?, a.require("query")?)?;
            to_value(&hits)
        },
    },
    Command {
        name: "typeahead",
        group: "read",
        summary: "Simulate type-to-find: the entry a folder selects when a name prefix is typed.",
        args: &[
            val("path", true, "Directory being browsed."),
            val("query", true, "Characters typed (matched as a name prefix, case-insensitive)."),
        ],
        run: |a| {
            let result = fs::typeahead_core(a.require("path")?, a.require("query")?)?;
            to_value(&result)
        },
    },
    Command {
        name: "dir-size",
        group: "read",
        summary: "Recursively sum the byte size of every file under a directory.",
        args: &[val("path", true, "Directory to measure.")],
        run: |a| {
            let path = a.require("path")?;
            Ok(json!({ "path": path, "size": fs::dir_size_core(path) }))
        },
    },
    Command {
        name: "recents",
        group: "read",
        summary: "Recently modified files under $HOME (Spotlight-backed, newest first, capped).",
        args: &[flag("hide-app-files", "Exclude this app's own config/cache writes.")],
        run: |a| {
            let app_dirs = if a.has("hide-app-files") {
                vec![app_config_dir()?, app_cache_dir()?]
            } else {
                Vec::new()
            };
            let entries = fs::recent_files_core(app_dirs)?;
            to_value(&entries)
        },
    },
    // -- Write ------------------------------------------------------------------------------
    Command {
        name: "copy",
        group: "write",
        summary: "Copy a file or directory into a destination directory (collision-safe).",
        args: &[
            val("source", true, "File or directory to copy."),
            val("dest-dir", true, "Directory to copy it into."),
        ],
        run: |a| {
            let mut noop = |_p, _t| {};
            let dest = fs::copy_entry_core(a.require("source")?, a.require("dest-dir")?, &mut noop)?;
            Ok(json!({ "dest": dest }))
        },
    },
    Command {
        name: "compress",
        group: "write",
        summary: "Compress a file or directory into a new .zip in a destination directory (collision-safe).",
        args: &[
            val("source", true, "File or directory to compress."),
            val("dest-dir", true, "Directory to write the archive into."),
            val("name", false, "Archive file name (default: <source>.zip)."),
            val("level", false, "DEFLATE compression level 0-9 (default 6)."),
            val("password", false, "Encrypt entries with AES-256 using this password."),
        ],
        run: |a| {
            let mut noop = |_p, _t| {};
            let source = a.require("source")?;
            let dest_dir = a.require("dest-dir")?;
            let name = match a.opt("name") {
                Some(n) => n.to_string(),
                None => format!(
                    "{}.zip",
                    Path::new(source)
                        .file_name()
                        .map(|n| n.to_string_lossy().into_owned())
                        .unwrap_or_else(|| "archive".to_string())
                ),
            };
            let level = a.opt("level").and_then(|l| l.parse::<i64>().ok()).unwrap_or(6);
            // Format follows the archive name's extension: .7z shells out to 7-Zip, else pure-Rust zip.
            let dest = if name.to_lowercase().ends_with(".7z") {
                archive::compress_7z_core(&[source.to_string()], dest_dir, &name, level, a.opt("password"))?
            } else {
                archive::compress_entries_core(
                    &[source.to_string()],
                    dest_dir,
                    &name,
                    level,
                    a.opt("password"),
                    &mut noop,
                )?
            };
            Ok(json!({ "dest": dest }))
        },
    },
    Command {
        name: "extract",
        group: "write",
        summary: "Extract a .zip or .7z into a destination directory.",
        args: &[
            val("archive", true, "Archive to extract (.zip or .7z)."),
            val("dest-dir", true, "Directory to extract into."),
            val("password", false, "Password for an encrypted archive."),
            flag("into-folder", "Wrap output in a new subfolder named after the archive (default: extract top-level entries directly into dest-dir)."),
        ],
        run: |a| {
            let mut noop = |_p, _t| {};
            let archive_path = a.require("archive")?;
            let dest_dir = a.require("dest-dir")?;
            // .zip uses the pure-Rust path; anything else (.7z) shells out to 7-Zip.
            let outputs = if archive_path.to_lowercase().ends_with(".zip") {
                archive::extract_archive_core(
                    archive_path,
                    dest_dir,
                    a.opt("password"),
                    a.has("into-folder"),
                    &mut noop,
                )?
            } else {
                archive::extract_7z_core(archive_path, dest_dir, a.opt("password"), a.has("into-folder"))?
            };
            Ok(json!({ "outputs": outputs }))
        },
    },
    Command {
        name: "move",
        group: "write",
        summary: "Move a file or directory into a destination directory (collision-safe).",
        args: &[
            val("source", true, "File or directory to move."),
            val("dest-dir", true, "Directory to move it into."),
        ],
        run: |a| {
            let mut noop = |_p, _t| {};
            let dest = fs::move_entry_core(a.require("source")?, a.require("dest-dir")?, &mut noop)?;
            Ok(json!({ "dest": dest }))
        },
    },
    Command {
        name: "rename",
        group: "write",
        summary: "Rename an entry in place within its parent directory.",
        args: &[
            val("path", true, "Entry to rename."),
            val("name", true, "New name (not a full path)."),
        ],
        run: |a| {
            let path = a.require("path")?;
            let name = a.require("name")?;
            fs::rename_entry_local(path.to_string(), name.to_string())?;
            let dest = PathBuf::from(path)
                .parent()
                .map(|p| p.join(name))
                .unwrap_or_else(|| PathBuf::from(name));
            Ok(json!({ "dest": dest.to_string_lossy() }))
        },
    },
    Command {
        name: "mkdir",
        group: "write",
        summary: "Create a new 'untitled folder' (uniquely named) inside a parent directory.",
        args: &[val("parent", true, "Directory to create the folder in.")],
        run: |a| {
            let created = fs::create_folder_local(a.require("parent")?.to_string())?;
            Ok(json!({ "path": created }))
        },
    },
    // -- Delete -----------------------------------------------------------------------------
    Command {
        name: "trash",
        group: "delete",
        summary: "Move an entry to the system Trash (reversible via `restore`).",
        args: &[val("path", true, "Entry to trash.")],
        run: |a| {
            fs::trash_entry_core(&app_config_dir()?, a.require("path")?)?;
            Ok(json!({ "trashed": a.require("path")? }))
        },
    },
    Command {
        name: "restore",
        group: "delete",
        summary: "Restore a trashed item to its recorded original location.",
        args: &[val("path", true, "Path of the item inside the Trash.")],
        run: |a| {
            match fs::restore_trashed_core(&app_config_dir()?, a.require("path")?)? {
                Some(dest) => Ok(json!({ "restored": dest })),
                None => Err("No recorded origin for that item; cannot restore.".to_string()),
            }
        },
    },
    Command {
        name: "delete",
        group: "delete",
        summary: "Permanently delete a file or directory (IRREVERSIBLE). Requires --force.",
        args: &[
            val("path", true, "Entry to delete permanently."),
            flag("force", "Required acknowledgement that this cannot be undone."),
        ],
        run: |a| {
            if !a.has("force") {
                return Err("Refusing to permanently delete without --force.".to_string());
            }
            fs::delete_permanently_core(a.require("path")?)?;
            Ok(json!({ "deleted": a.require("path")? }))
        },
    },
    Command {
        name: "empty-trash",
        group: "delete",
        summary: "Permanently empty ~/.Trash (IRREVERSIBLE). Requires --force.",
        args: &[flag("force", "Required acknowledgement that this cannot be undone.")],
        run: |a| {
            if !a.has("force") {
                return Err("Refusing to empty the Trash without --force.".to_string());
            }
            Ok(json!({ "removed": fs::empty_trash_core()? }))
        },
    },
    // -- Tags (macOS Finder tags) -----------------------------------------------------------
    Command {
        name: "tags-get",
        group: "tags",
        summary: "Read the Finder tags on a path.",
        args: &[val("path", true, "Path to read tags from.")],
        run: |a| to_value(&tags::read_tags(a.require("path")?)),
    },
    Command {
        name: "tags-set",
        group: "tags",
        summary: "Replace a path's Finder tags. Pass a JSON array; [] clears all tags.",
        args: &[
            val("path", true, "Path to tag."),
            val(
                "tags",
                true,
                r#"JSON array of {"name":string,"color":0-7}, e.g. [{"name":"Work","color":4}]."#,
            ),
        ],
        run: |a| {
            let parsed: Vec<tags::Tag> = serde_json::from_str(a.require("tags")?)
                .map_err(|e| format!("Invalid --tags JSON: {}", e))?;
            tags::write_tags(a.require("path")?, &parsed)?;
            Ok(json!({ "path": a.require("path")?, "count": parsed.len() }))
        },
    },
    Command {
        name: "tags-find",
        group: "tags",
        summary: "Find files carrying a given tag (Spotlight-backed, scoped to $HOME).",
        args: &[val("tag", true, "Tag name to search for.")],
        run: |a| to_value(&tags::find_tagged_core(a.require("tag")?)),
    },
    Command {
        name: "tags-list",
        group: "tags",
        summary: "List the distinct tags currently in use under $HOME.",
        args: &[],
        run: |_a| to_value(&tags::list_all_tags_core()),
    },
    // -- SSH/SFTP connections (write connections.toml headlessly; see SSH_PLAN.md) ----------
    Command {
        name: "sftp-list",
        group: "sftp",
        summary: "List saved SSH/SFTP connections (passwords omitted).",
        args: &[],
        run: |_a| {
            let list: Vec<sftp::ConnectionInfo> = sftp::load_connections_from(&app_config_dir()?)
                .into_iter()
                .map(sftp::ConnectionInfo::from)
                .collect();
            to_value(&list)
        },
    },
    Command {
        name: "sftp-add",
        group: "sftp",
        summary: "Add or replace (by id) an SSH/SFTP connection in connections.toml.",
        args: &[
            val("id", true, "Stable id (also the sftp://<id>/ path segment)."),
            val("name", true, "Display name shown in the sidebar."),
            val("host", true, "Hostname or IP."),
            val("user", true, "SSH username."),
            val("port", false, "SSH port (default 22)."),
            val("key-path", false, "Private key path (default: ~/.ssh/id_ed25519|id_ecdsa|id_rsa)."),
            val("key-passphrase", false, "Passphrase for the key (else set SFB_SSH_KEY_PASSPHRASE)."),
            val("password", false, "Password — stored in the OS keychain, not the toml."),
        ],
        run: |a| {
            // Default SSH port; connections may override it.
            let port: u16 = match a.opt("port") {
                Some(raw) => raw.parse().map_err(|_| format!("invalid --port: {raw}"))?,
                None => 22,
            };
            let conn = sftp::Connection {
                id: a.require("id")?.to_string(),
                name: a.require("name")?.to_string(),
                host: a.require("host")?.to_string(),
                port,
                user: a.require("user")?.to_string(),
                key_path: a.opt("key-path").map(|s| s.to_string()),
                key_passphrase: a.opt("key-passphrase").map(|s| s.to_string()),
                password: a.opt("password").map(|s| s.to_string()),
            };
            let id = conn.id.clone();
            let dir = app_config_dir()?;
            let replaced = sftp::load_connections_from(&dir).iter().any(|c| c.id == id);
            // Same core as the GUI: secrets go to the OS keychain, not the plaintext toml.
            sftp::add_connection_with_secrets(&dir, conn)?;
            Ok(json!({ "id": id, "replaced": replaced }))
        },
    },
    Command {
        name: "sftp-remove",
        group: "sftp",
        summary: "Remove a saved SSH/SFTP connection by id.",
        args: &[val("id", true, "Id of the connection to remove.")],
        run: |a| {
            let removed = sftp::remove_connection_from(&app_config_dir()?, a.require("id")?)?;
            Ok(json!({ "id": a.require("id")?, "removed": removed }))
        },
    },
    // -- SMB diagnostics (native macOS mounting; no credentials accepted by the CLI) --------
    Command {
        name: "smb-diagnose",
        group: "smb",
        summary: "Resolve an SMB host and probe TCP port 445 without authenticating.",
        args: &[
            val("host", true, "Windows hostname or IP address."),
            val(
                "share",
                false,
                "Optional Windows share name, included in the reported URL.",
            ),
            val(
                "timeout-ms",
                false,
                "Timeout per resolved address in milliseconds (default 2000).",
            ),
        ],
        run: |a| {
            let timeout_ms = match a.opt("timeout-ms") {
                Some(raw) => raw
                    .parse::<u64>()
                    .map_err(|_| format!("invalid --timeout-ms: {raw}"))?,
                None => 2_000,
            };
            if timeout_ms == 0 || timeout_ms > 60_000 {
                return Err("--timeout-ms must be between 1 and 60000".to_string());
            }
            let result = smb::diagnose(
                a.require("host")?,
                a.opt("share"),
                std::time::Duration::from_millis(timeout_ms),
            )?;
            to_value(&result)
        },
    },
    Command {
        name: "smb-mounts",
        group: "smb",
        summary: "List native SMB mounts and their local filesystem paths.",
        args: &[],
        run: |_a| to_value(&smb::mounts()?),
    },
    Command {
        name: "smb-shares",
        group: "smb",
        summary: "List the disk shares a host exposes (needs a prior macOS sign-in; Keychain-backed).",
        args: &[val("host", true, "Windows hostname or IP address.")],
        run: |a| to_value(&smb::shares(a.require("host")?)?),
    },
    Command {
        name: "smb-connect",
        group: "smb",
        summary: "Ask macOS to connect to an SMB share using its native credential UI.",
        args: &[
            val("host", true, "Windows hostname or IP address."),
            val("share", true, "Windows share name."),
        ],
        run: |a| {
            let url = smb::connect(a.require("host")?, a.require("share")?)?;
            Ok(json!({ "url": url, "launched": true }))
        },
    },
    Command {
        name: "smb-save",
        group: "smb",
        summary: "Save a Windows share as a sidebar location in the Network group (sidebar.toml).",
        args: &[
            val("host", true, "Windows hostname or IP address."),
            val("share", true, "Windows share name."),
            val(
                "name",
                false,
                "Optional display name (defaults to the share name).",
            ),
        ],
        run: |a| {
            let host = a.require("host")?;
            let share = a.require("share")?;
            // Validate host/share the same way the mount URL builder does (rejects slashes in the
            // share, whitespace in the host, etc.) before persisting the location.
            smb::url(host, Some(share))?;
            let path = smb::location_path(host, share, a.opt("name"));
            let added = sidebar::add_item_to(&app_config_dir()?, "network", path.clone())?;
            Ok(json!({ "path": path, "added": added, "group": "network" }))
        },
    },
    // -- UI (drive the running GUI over the control socket) ---------------------------------
    Command {
        name: "ui-state",
        group: "ui",
        summary: "Report the running app's live UI (open windows, tabs, current path, view).",
        args: &[],
        run: |_a| ui_call("get-state", json!({})),
    },
    Command {
        name: "ui-windows",
        group: "ui",
        summary: "List every open window straight from Tauri (label, URL, visible, focused) — includes hidden windows and the detached preview panel.",
        args: &[],
        run: |_a| ui_call("windows", json!({})),
    },
    Command {
        name: "ui-preview",
        group: "ui",
        summary: "Open the detached preview window for a file (the openPreviewInWindow flow).",
        args: &[val("path", true, "File to preview.")],
        run: |a| ui_call("preview", json!({ "path": a.require("path")? })),
    },
    Command {
        name: "ui-properties",
        group: "ui",
        summary: "Open the detached properties window for an entry (the openPropertiesInWindow flow).",
        args: &[val("path", true, "File or folder to inspect.")],
        run: |a| ui_call("properties", json!({ "path": a.require("path")? })),
    },
    Command {
        name: "ui-navigate",
        group: "ui",
        summary: "Navigate the focused window's active tab to a directory.",
        args: &[val("path", true, "Directory to navigate to.")],
        run: |a| ui_call("navigate", json!({ "path": a.require("path")? })),
    },
    Command {
        name: "ui-open-window",
        group: "ui",
        summary: "Open a new file-browser window rooted at a directory.",
        args: &[val("path", true, "Directory the new window opens at.")],
        run: |a| ui_call("open-window", json!({ "path": a.require("path")? })),
    },
    Command {
        name: "ui-new-tab",
        group: "ui",
        summary: "Open a new tab in the focused window (clones the active tab's path by default).",
        args: &[val(
            "path",
            false,
            "Directory the new tab opens at (defaults to the active tab's).",
        )],
        run: |a| {
            let mut payload = json!({ "op": "new" });
            if let Some(path) = a.opt("path") {
                payload["path"] = json!(path);
            }
            ui_call("tab", payload)
        },
    },
    Command {
        name: "ui-close-tab",
        group: "ui",
        summary: "Close a tab by id or 0-based index (ids come from `ui-state`).",
        args: &[
            val("id", false, "Id of the tab to close."),
            val("index", false, "0-based index of the tab to close."),
        ],
        run: |a| {
            let mut payload = json!({ "op": "close" });
            if let Some(id) = a.opt("id") {
                payload["id"] = json!(id);
            }
            if let Some(index) = a.opt("index") {
                payload["index"] =
                    json!(index.parse::<usize>().map_err(|e| format!("--index: {e}"))?);
            }
            ui_call("tab", payload)
        },
    },
    Command {
        name: "ui-move-tab",
        group: "ui",
        summary: "Reorder a tab from one 0-based index to another.",
        args: &[
            val("from", true, "0-based index to move from."),
            val("to", true, "0-based index to move to."),
        ],
        run: |a| {
            let from = a
                .require("from")?
                .parse::<usize>()
                .map_err(|e| format!("--from: {e}"))?;
            let to = a
                .require("to")?
                .parse::<usize>()
                .map_err(|e| format!("--to: {e}"))?;
            ui_call("tab", json!({ "op": "move", "from": from, "to": to }))
        },
    },
    Command {
        name: "ui-probe",
        group: "ui",
        summary: "Drag-drop + sidebar + preview/find diagnostics (DEBUG-ONLY: run the app with --debug/SFB_DEBUG=1).",
        args: &[
            val("x", false, "CSS-pixel X to hit-test (pair with --y)."),
            val("y", false, "CSS-pixel Y to hit-test (pair with --x)."),
            val(
                "target",
                false,
                "Folder name or full path; hit-tests its own tile center to check the resolver.",
            ),
        ],
        run: |a| {
            let mut probe = json!({});
            if let Some(x) = a.opt("x") {
                probe["x"] = json!(x.parse::<f64>().map_err(|e| format!("--x: {e}"))?);
            }
            if let Some(y) = a.opt("y") {
                probe["y"] = json!(y.parse::<f64>().map_err(|e| format!("--y: {e}"))?);
            }
            if let Some(target) = a.opt("target") {
                probe["target"] = json!(target);
            }
            ui_call("probe", probe)
        },
    },
];

const FILESYSTEM_SCOPE: &str = "filesystem";
const CONNECTIONS_SCOPE: &str = "connections";
const UI_SCOPE: &str = "ui";
const ALL_PLATFORMS: &[&str] = &["macos", "windows", "linux"];
const MACOS_ONLY: &[&str] = &["macos"];

const fn op(
    verb: &'static str,
    resource: &'static str,
    resource_aliases: &'static [&'static str],
    command: &'static str,
    positional_args: &'static [&'static str],
    scope: &'static str,
    destructive: bool,
    reversible: bool,
    requires_app: bool,
    platforms: &'static [&'static str],
) -> OperationSpec {
    OperationSpec {
        verb,
        resource,
        resource_aliases,
        command,
        positional_args,
        scope,
        destructive,
        reversible,
        requires_app,
        platforms,
    }
}

// Resource-oriented public API. Each row delegates to one existing COMMANDS entry.
const OPERATIONS: &[OperationSpec] = &[
    op(
        "get",
        "entries",
        &["files", "directory-entries"],
        "list",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "get",
        "entry",
        &["file", "path"],
        "info",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "find",
        "entries",
        &["files", "directory-entries"],
        "search",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "match",
        "entry",
        &["file", "path"],
        "typeahead",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "get",
        "size",
        &["dir-size"],
        "dir-size",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "get",
        "recent",
        &["recents"],
        "recents",
        &[],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "copy",
        "entry",
        &["file", "path"],
        "copy",
        &["source"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "create",
        "archive",
        &["archives"],
        "compress",
        &["source"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "extract",
        "archive",
        &["archives"],
        "extract",
        &["archive"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "move",
        "entry",
        &["file", "path"],
        "move",
        &["source"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "rename",
        "entry",
        &["file", "path"],
        "rename",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "create",
        "directory",
        &["dir", "folder"],
        "mkdir",
        &["parent"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "trash",
        "entry",
        &["file", "path"],
        "trash",
        &["path"],
        FILESYSTEM_SCOPE,
        true,
        true,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "restore",
        "entry",
        &["file", "path"],
        "restore",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "delete",
        "entry",
        &["file", "path"],
        "delete",
        &["path"],
        FILESYSTEM_SCOPE,
        true,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "empty",
        "trash",
        &["bin"],
        "empty-trash",
        &[],
        FILESYSTEM_SCOPE,
        true,
        false,
        false,
        ALL_PLATFORMS,
    ),
    op(
        "get",
        "entry-tags",
        &["file-tags"],
        "tags-get",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "set",
        "entry-tags",
        &["file-tags"],
        "tags-set",
        &["path"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "find",
        "tagged",
        &["tagged-entries"],
        "tags-find",
        &["tag"],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "get",
        "tag",
        &["tags", "tag-catalog"],
        "tags-list",
        &[],
        FILESYSTEM_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "get",
        "connection",
        &["connections", "sftp", "sftp-connections"],
        "sftp-list",
        &[],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "create",
        "connection",
        &["connections", "sftp", "sftp-connections"],
        "sftp-add",
        &["id"],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "delete",
        "connection",
        &["connections", "sftp", "sftp-connections"],
        "sftp-remove",
        &["id"],
        CONNECTIONS_SCOPE,
        true,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "diagnose",
        "share",
        &["shares", "smb-share"],
        "smb-diagnose",
        &["host", "share"],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "get",
        "mount",
        &["mounts", "smb-mounts"],
        "smb-mounts",
        &[],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "get",
        "share",
        &["shares", "smb-shares"],
        "smb-shares",
        &["host"],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "connect",
        "share",
        &["shares", "smb-share"],
        "smb-connect",
        &["host", "share"],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "create",
        "share",
        &["shares", "smb-share"],
        "smb-save",
        &["host", "share"],
        CONNECTIONS_SCOPE,
        false,
        false,
        false,
        MACOS_ONLY,
    ),
    op(
        "get",
        "app",
        &["state", "app-state"],
        "ui-state",
        &[],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "get",
        "window",
        &["windows"],
        "ui-windows",
        &[],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "open",
        "preview",
        &["previews"],
        "ui-preview",
        &["path"],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "open",
        "properties",
        &[],
        "ui-properties",
        &["path"],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "navigate",
        "current-tab",
        &["active-tab", "focused-tab"],
        "ui-navigate",
        &["path"],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "create",
        "window",
        &["windows"],
        "ui-open-window",
        &["path"],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "create",
        "tab",
        &["tabs"],
        "ui-new-tab",
        &["path"],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "close",
        "tab",
        &["tabs"],
        "ui-close-tab",
        &[],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "move",
        "tab",
        &["tabs"],
        "ui-move-tab",
        &[],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
    op(
        "diagnose",
        "ui",
        &["probe"],
        "ui-probe",
        &[],
        UI_SCOPE,
        false,
        false,
        true,
        MACOS_ONLY,
    ),
];

const ARG_ALIASES: &[ArgAlias] = &[
    ArgAlias {
        command: "search",
        alias: "name",
        canonical: "query",
    },
    ArgAlias {
        command: "copy",
        alias: "to",
        canonical: "dest-dir",
    },
    ArgAlias {
        command: "compress",
        alias: "to",
        canonical: "dest-dir",
    },
    ArgAlias {
        command: "extract",
        alias: "to",
        canonical: "dest-dir",
    },
    ArgAlias {
        command: "move",
        alias: "to",
        canonical: "dest-dir",
    },
    ArgAlias {
        command: "tags-set",
        alias: "values",
        canonical: "tags",
    },
];

// ---- Argument parsing -------------------------------------------------------------------------

// Parsed `--key value` pairs and `--flag` presence for one invocation, validated against the
// command's ArgSpec so unknown flags and missing values are rejected up front.
struct Parsed {
    values: HashMap<String, String>,
    flags: Vec<String>,
}

impl Parsed {
    fn require(&self, key: &str) -> Result<&str, String> {
        self.values
            .get(key)
            .map(|s| s.as_str())
            .ok_or_else(|| format!("Missing required argument --{}", key))
    }
    fn opt(&self, key: &str) -> Option<&str> {
        self.values.get(key).map(|s| s.as_str())
    }
    fn has(&self, key: &str) -> bool {
        self.flags.iter().any(|f| f == key)
    }
}

fn canonical_arg_name<'a>(command: &str, key: &'a str) -> &'a str {
    match ARG_ALIASES
        .iter()
        .find(|alias| alias.command == command && alias.alias == key)
    {
        Some(alias) => alias.canonical,
        None => key,
    }
}

// Parse the tokens after the command name using the command's spec: `--value-arg X` consumes the
// next token; `--flag` stands alone. Rejects unknown flags, missing values, and absent required
// args so a mistyped call fails loudly instead of silently doing the wrong thing.
fn parse_args(cmd: &Command, tokens: &[String]) -> Result<Parsed, String> {
    let mut values = HashMap::new();
    let mut flags = Vec::new();

    let mut i = 0;
    while i < tokens.len() {
        let token = &tokens[i];
        let requested_key = token
            .strip_prefix("--")
            .ok_or_else(|| format!("Expected a --flag but got '{}'", token))?;
        let key = canonical_arg_name(cmd.name, requested_key);
        let spec = cmd
            .args
            .iter()
            .find(|a| a.name == key)
            .ok_or_else(|| {
                format!(
                    "Unknown argument --{} for command '{}'",
                    requested_key, cmd.name
                )
            })?;

        if spec.takes_value {
            let value = tokens
                .get(i + 1)
                .ok_or_else(|| format!("--{} needs a value", requested_key))?;
            values.insert(spec.name.to_string(), value.clone());
            i += 2;
        } else {
            flags.push(spec.name.to_string());
            i += 1;
        }
    }

    for spec in cmd.args {
        if spec.required && !values.contains_key(spec.name) {
            return Err(format!("Missing required argument --{}", spec.name));
        }
    }

    Ok(Parsed { values, flags })
}

fn command_named(name: &str) -> Option<&'static Command> {
    COMMANDS.iter().find(|command| command.name == name)
}

fn resource_matches(operation: &OperationSpec, resource: &str) -> bool {
    operation.resource == resource
        || operation
            .resource_aliases
            .iter()
            .any(|alias| *alias == resource)
}

fn operation_for(verb: &str, resource: &str) -> Option<&'static OperationSpec> {
    OPERATIONS
        .iter()
        .find(|operation| operation.verb == verb && resource_matches(operation, resource))
}

fn operation_for_command(command: &str) -> Option<&'static OperationSpec> {
    OPERATIONS
        .iter()
        .find(|operation| operation.command == command)
}

fn is_operation_verb(value: &str) -> bool {
    OPERATIONS.iter().any(|operation| operation.verb == value)
}

fn rewrite_resource_args(
    operation: &OperationSpec,
    tokens: &[String],
) -> Result<Vec<String>, String> {
    let command = command_named(operation.command)
        .ok_or_else(|| format!("CLI registry error: missing command '{}'", operation.command))?;
    let mut rewritten = vec![operation.command.to_string()];
    let mut positional_index = 0;
    let mut index = 0;

    while index < tokens.len() {
        let token = &tokens[index];
        if let Some(requested_key) = token.strip_prefix("--") {
            let key = canonical_arg_name(command.name, requested_key);
            let Some(spec) = command.args.iter().find(|arg| arg.name == key) else {
                // Preserve the remaining input so the normal parser reports the unknown option
                // with the same contract used by legacy commands.
                rewritten.extend_from_slice(&tokens[index..]);
                break;
            };
            rewritten.push(token.clone());
            if spec.takes_value {
                let value = tokens
                    .get(index + 1)
                    .ok_or_else(|| format!("--{} needs a value", requested_key))?;
                rewritten.push(value.clone());
                index += 2;
            } else {
                index += 1;
            }
            continue;
        }

        let arg_name = operation
            .positional_args
            .get(positional_index)
            .ok_or_else(|| {
                format!(
                    "Unexpected positional argument '{}' for `sfb {} {}`",
                    token, operation.verb, operation.resource
                )
            })?;
        rewritten.push(format!("--{}", arg_name));
        rewritten.push(token.clone());
        positional_index += 1;
        index += 1;
    }

    Ok(rewritten)
}

// Resolve `sfb <verb> <resource> ...` to an existing flat command. A legacy command whose name is
// also a verb (`copy`, `move`, `delete`, etc.) remains untouched when no resource follows.
fn desugar_resource_command(argv: Vec<String>) -> Result<Vec<String>, String> {
    let Some(verb) = argv.first().map(String::as_str) else {
        return Ok(argv);
    };
    if !is_operation_verb(verb) {
        return Ok(argv);
    }

    let resource = argv.get(1).map(String::as_str);
    if let Some(resource) = resource {
        if let Some(operation) = operation_for(verb, resource) {
            return rewrite_resource_args(operation, &argv[2..]);
        }
    }

    if command_named(verb).is_some() {
        return Ok(argv);
    }

    match resource {
        Some(resource) => Err(format!(
            "Unknown resource '{}' for verb '{}'. Try `sfb api-resources`.",
            resource, verb
        )),
        None => Err(format!(
            "Verb '{}' needs a resource. Try `sfb api-resources`.",
            verb
        )),
    }
}

// ---- App directories (must mirror Tauri's paths for the running identifier) -------------------

// The trash-origin ledger lives in the GUI app's config dir; the CLI must resolve the same path so
// `trash`/`restore` interoperate with the app. These mirror Tauri's macOS conventions for the
// identifier in tauri.conf.json (com.sito8943.file-browser).
fn home() -> Result<PathBuf, String> {
    std::env::var("HOME")
        .map(PathBuf::from)
        .map_err(|e| e.to_string())
}
fn app_config_dir() -> Result<PathBuf, String> {
    Ok(home()?
        .join("Library/Application Support")
        .join("com.sito8943.file-browser"))
}
fn app_cache_dir() -> Result<PathBuf, String> {
    Ok(home()?
        .join("Library/Caches")
        .join("com.sito8943.file-browser"))
}

// ---- UI control socket (drive the running GUI) ------------------------------------------------

// Send one action to the running app's control socket and return its `data` (or its error). The
// socket is a Unix-domain socket in the app config dir (same path the GUI binds); if the app isn't
// running the connect fails, which we surface as a clear "app not running" message.
#[cfg(unix)]
fn ui_call(action: &str, args: Value) -> Result<Value, String> {
    use std::io::{BufRead, BufReader, Write};
    use std::os::unix::net::UnixStream;

    let socket = app_config_dir()?.join("sfb-control.sock");
    let mut stream = UnixStream::connect(&socket)
        .map_err(|e| format!("File Browser app not running (no control socket): {e}"))?;

    let request = json!({ "action": action, "args": args }).to_string();
    stream
        .write_all(request.as_bytes())
        .and_then(|_| stream.write_all(b"\n"))
        .map_err(|e| e.to_string())?;

    let mut reader = BufReader::new(stream);
    let mut line = String::new();
    reader.read_line(&mut line).map_err(|e| e.to_string())?;

    let response: Value = serde_json::from_str(line.trim()).map_err(|e| e.to_string())?;
    if response.get("ok").and_then(Value::as_bool) == Some(true) {
        Ok(response.get("data").cloned().unwrap_or(Value::Null))
    } else {
        Err(response
            .get("error")
            .and_then(Value::as_str)
            .unwrap_or("control socket error")
            .to_string())
    }
}

#[cfg(not(unix))]
fn ui_call(_action: &str, _args: Value) -> Result<Value, String> {
    Err("UI control is only available on Unix (macOS).".to_string())
}

// ---- `sfb <path>` — open a folder / reveal a file in the running GUI --------------------------

// Make a user-supplied path absolute and lexically clean (no symlink resolution, so it still
// matches how the app lists entries as parent.join(name)). `.` becomes the current directory.
fn absolutize(input: &str) -> Result<PathBuf, String> {
    let raw = Path::new(input);
    let base = if raw.is_absolute() {
        raw.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| e.to_string())?
            .join(raw)
    };
    let mut out = PathBuf::new();
    for comp in base.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => {
                out.pop();
            }
            other => out.push(other.as_os_str()),
        }
    }
    Ok(out)
}

// Heuristic: treat the first token as a path (not a command) when it names something on disk or is
// obviously path-shaped, so `sfb .` / `sfb ./x` / `sfb /abs` / `sfb file.pdf` work while a mistyped
// command still reaches the unknown-command help.
fn looks_like_path(token: &str) -> bool {
    token == "."
        || token == ".."
        || token.starts_with('/')
        || token.starts_with("./")
        || token.starts_with("../")
        || token.starts_with('~')
        || Path::new(token).exists()
}

// Make sure the GUI is running (it lives in the tray, so usually is). If not, launch it by bundle
// id and wait for its control socket to come up.
#[cfg(unix)]
fn ensure_running() -> Result<(), String> {
    use std::os::unix::net::UnixStream;
    use std::time::Duration;

    let socket = app_config_dir()?.join("sfb-control.sock");
    if UnixStream::connect(&socket).is_ok() {
        return Ok(());
    }
    std::process::Command::new("open")
        .arg("-b")
        .arg("com.sito8943.file-browser")
        .status()
        .map_err(|e| format!("couldn't launch the app: {e}"))?;
    for _ in 0..50 {
        std::thread::sleep(Duration::from_millis(100));
        if UnixStream::connect(&socket).is_ok() {
            return Ok(());
        }
    }
    Err("launched the app but its control socket didn't come up in time".to_string())
}

#[cfg(not(unix))]
fn ensure_running() -> Result<(), String> {
    Err("UI control is only available on Unix (macOS).".to_string())
}

// `sfb <path>`: open a directory in a new window, or reveal a file (parent folder + the file
// selected), in the running app — launching it first if needed. Exits with the JSON envelope.
fn open_or_reveal(token: &str) -> ! {
    let abs = match absolutize(token) {
        Ok(p) => p,
        Err(e) => emit_err(e),
    };
    let path = abs.to_string_lossy().to_string();
    let action = if abs.is_dir() {
        "open-window"
    } else if abs.is_file() {
        "reveal"
    } else {
        emit_err(format!("no such file or directory: {path}"));
    };
    if let Err(e) = ensure_running() {
        emit_err(e);
    }
    match ui_call(action, json!({ "path": path })) {
        Ok(_) => emit_ok(json!({ "action": action, "path": path })),
        Err(e) => emit_err(e),
    }
}

// ---- Output helpers ---------------------------------------------------------------------------

fn to_value<T: serde::Serialize>(v: &T) -> Result<Value, String> {
    serde_json::to_value(v).map_err(|e| e.to_string())
}

fn emit_ok(data: Value) -> ! {
    println!("{}", json!({ "ok": true, "data": data }));
    exit(0);
}
fn emit_err(msg: String) -> ! {
    println!("{}", json!({ "ok": false, "error": msg }));
    exit(1);
}

fn arg_aliases(command: &str, canonical: &str) -> Vec<&'static str> {
    ARG_ALIASES
        .iter()
        .filter(|alias| alias.command == command && alias.canonical == canonical)
        .map(|alias| alias.alias)
        .collect()
}

fn operation_syntax(operation: &OperationSpec) -> Result<String, String> {
    let command = command_named(operation.command)
        .ok_or_else(|| format!("CLI registry error: missing command '{}'", operation.command))?;
    let mut syntax = format!("sfb {} {}", operation.verb, operation.resource);
    for positional in operation.positional_args {
        let arg = command
            .args
            .iter()
            .find(|arg| arg.name == *positional)
            .ok_or_else(|| {
                format!(
                    "CLI registry error: '{}' has no --{} argument",
                    operation.command, positional
                )
            })?;
        if arg.required {
            syntax.push_str(&format!(" <{}>", positional));
        } else {
            syntax.push_str(&format!(" [<{}>]", positional));
        }
    }
    for arg in command.args.iter().filter(|arg| {
        !operation
            .positional_args
            .iter()
            .any(|positional| *positional == arg.name)
    }) {
        let aliases = arg_aliases(command.name, arg.name);
        let display_name = aliases.first().copied().unwrap_or(arg.name);
        let option = if arg.takes_value {
            format!("--{} <{}>", display_name, arg.name)
        } else {
            format!("--{}", display_name)
        };
        if arg.required {
            syntax.push_str(&format!(" {}", option));
        } else {
            syntax.push_str(&format!(" [{}]", option));
        }
    }
    Ok(syntax)
}

fn operation_value(operation: &OperationSpec) -> Result<Value, String> {
    let command = command_named(operation.command)
        .ok_or_else(|| format!("CLI registry error: missing command '{}'", operation.command))?;
    let args: Vec<Value> = command
        .args
        .iter()
        .map(|arg| {
            json!({
                "name": arg.name,
                "aliases": arg_aliases(command.name, arg.name),
                "required": arg.required,
                "takesValue": arg.takes_value,
                "positional": operation
                    .positional_args
                    .iter()
                    .position(|name| *name == arg.name),
                "description": arg.description,
            })
        })
        .collect();
    Ok(json!({
        "verb": operation.verb,
        "resource": operation.resource,
        "resourceAliases": operation.resource_aliases,
        "syntax": operation_syntax(operation)?,
        "summary": command.summary,
        "legacyName": command.name,
        "scope": operation.scope,
        "destructive": operation.destructive,
        "reversible": operation.reversible,
        "requiresApp": operation.requires_app,
        "platforms": operation.platforms,
        "args": args,
    }))
}

struct ResourceSummary {
    aliases: Vec<&'static str>,
    verbs: Vec<&'static str>,
    scopes: Vec<&'static str>,
    requires_app: bool,
    platforms: Vec<&'static str>,
}

fn push_unique(values: &mut Vec<&'static str>, value: &'static str) {
    if !values.contains(&value) {
        values.push(value);
    }
}

fn resource_values() -> Vec<Value> {
    let mut resources: BTreeMap<&'static str, ResourceSummary> = BTreeMap::new();
    for operation in OPERATIONS {
        let summary = resources
            .entry(operation.resource)
            .or_insert_with(|| ResourceSummary {
                aliases: Vec::new(),
                verbs: Vec::new(),
                scopes: Vec::new(),
                requires_app: false,
                platforms: Vec::new(),
            });
        for alias in operation.resource_aliases {
            push_unique(&mut summary.aliases, *alias);
        }
        push_unique(&mut summary.verbs, operation.verb);
        push_unique(&mut summary.scopes, operation.scope);
        summary.requires_app |= operation.requires_app;
        for platform in operation.platforms {
            push_unique(&mut summary.platforms, *platform);
        }
    }

    resources
        .into_iter()
        .map(|(name, summary)| {
            json!({
                "name": name,
                "aliases": summary.aliases,
                "verbs": summary.verbs,
                "scopes": summary.scopes,
                "requiresApp": summary.requires_app,
                "platforms": summary.platforms,
            })
        })
        .collect()
}

fn api_resources() -> Value {
    json!({
        "apiVersion": "sfb/v1alpha1",
        "resources": resource_values(),
    })
}

fn explain(tokens: &[String]) -> Result<Value, String> {
    if tokens.is_empty() || tokens.len() > 2 {
        return Err(
            "Usage: sfb explain <resource> | sfb explain <verb> <resource>".to_string(),
        );
    }

    let operations: Vec<&OperationSpec> = if tokens.len() == 1 {
        OPERATIONS
            .iter()
            .filter(|operation| resource_matches(operation, &tokens[0]))
            .collect()
    } else {
        operation_for(&tokens[0], &tokens[1]).into_iter().collect()
    };
    if operations.is_empty() {
        return Err(format!(
            "No resource operation matches '{}'. Try `sfb api-resources`.",
            tokens.join(" ")
        ));
    }

    let values: Result<Vec<Value>, String> =
        operations.into_iter().map(operation_value).collect();
    Ok(json!({
        "apiVersion": "sfb/v1alpha1",
        "query": tokens,
        "operations": values?,
    }))
}

// Machine-readable description of every command, for `sfb schema`. The legacy command fields stay
// in place while canonical resource metadata is added alongside them.
fn schema() -> Result<Value, String> {
    let commands: Result<Vec<Value>, String> = COMMANDS
        .iter()
        .map(|command| {
            let operation = operation_for_command(command.name).ok_or_else(|| {
                format!(
                    "CLI registry error: command '{}' has no resource operation",
                    command.name
                )
            })?;
            let args: Vec<Value> = command
                .args
                .iter()
                .map(|arg| {
                    json!({
                        "name": arg.name,
                        "aliases": arg_aliases(command.name, arg.name),
                        "required": arg.required,
                        "takesValue": arg.takes_value,
                        "description": arg.description,
                    })
                })
                .collect();
            Ok(json!({
                "name": command.name,
                "group": command.group,
                "summary": command.summary,
                "args": args,
                "canonical": operation_value(operation)?,
            }))
        })
        .collect();
    Ok(json!({
        "apiVersion": "sfb/v1alpha1",
        "tool": "sfb",
        "envelope": { "ok": "bool", "data": "present when ok", "error": "present when !ok" },
        "resources": resource_values(),
        "commands": commands?,
    }))
}

fn operation_help_text(operation: &OperationSpec) -> Result<String, String> {
    let command = command_named(operation.command)
        .ok_or_else(|| format!("CLI registry error: missing command '{}'", operation.command))?;
    let mut out = format!(
        "{}\n\nUsage: {}\nLegacy alias: sfb {}\n\n",
        command.summary,
        operation_syntax(operation)?,
        command.name
    );
    if !command.args.is_empty() {
        out.push_str("Arguments:\n");
        for arg in command.args {
            let aliases = arg_aliases(command.name, arg.name);
            let alias_text = if aliases.is_empty() {
                String::new()
            } else {
                format!(
                    " (aliases: {})",
                    aliases
                        .iter()
                        .map(|alias| format!("--{}", alias))
                        .collect::<Vec<_>>()
                        .join(", ")
                )
            };
            out.push_str(&format!(
                "  --{:<18} {}{}\n",
                arg.name, arg.description, alias_text
            ));
        }
    }
    Ok(out)
}

// Human-readable help presents the canonical resource grammar first. Flat names remain listed as
// legacy aliases so existing scripts stay discoverable.
fn help_text() -> String {
    let mut out = String::from(
        "sfb — resource-oriented file-browser CLI (JSON out).\n\nUsage: sfb <verb> <resource> [target ...] [--option value ...]\n       sfb <legacy-command> [--arg value ...]\n       sfb <path>   open a folder, or reveal a file, in the app\n\n",
    );
    for scope in [FILESYSTEM_SCOPE, CONNECTIONS_SCOPE, UI_SCOPE] {
        out.push_str(&format!("{}:\n", scope));
        for operation in OPERATIONS.iter().filter(|operation| operation.scope == scope) {
            let command = match command_named(operation.command) {
                Some(command) => command,
                None => continue,
            };
            let syntax = match operation_syntax(operation) {
                Ok(syntax) => syntax.trim_start_matches("sfb ").to_string(),
                Err(_) => continue,
            };
            out.push_str(&format!(
                "  {:<34} {} (legacy: {})\n",
                syntax, command.summary, command.name
            ));
        }
        out.push('\n');
    }
    out.push_str(
        "discovery:\n  api-resources                  List resources, verbs, scopes and platforms as JSON.\n  explain <resource>             Describe every operation for a resource as JSON.\n  explain <verb> <resource>      Describe one canonical operation as JSON.\n  schema                         Emit the complete machine-readable CLI schema.\n  help                           Show this help.\n",
    );
    out
}

// `sfb ui <sub> …` is sugar for the flat `ui-<sub>` command, so the grouped form the user expects
// works without a nested parser. Leaves a bare `sfb ui` untouched (falls through to unknown-command
// help). Returns the possibly-rewritten argument vector.
fn desugar_ui(mut argv: Vec<String>) -> Vec<String> {
    if argv.first().map(String::as_str) == Some("ui") {
        if let Some(sub) = argv.get(1).cloned() {
            argv.splice(0..2, [format!("ui-{sub}")]);
        }
    }
    argv
}

fn main() {
    let argv: Vec<String> = std::env::args().skip(1).collect();
    let argv = desugar_ui(argv);

    let Some(initial_name) = argv.first().cloned() else {
        print!("{}", help_text());
        exit(0);
    };

    match initial_name.as_str() {
        "help" | "--help" | "-h" => {
            print!("{}", help_text());
            exit(0);
        }
        "schema" | "--schema" => match schema() {
            Ok(value) => emit_ok(value),
            Err(error) => emit_err(error),
        },
        "api-resources" => emit_ok(api_resources()),
        "explain" => match explain(&argv[1..]) {
            Ok(value) => emit_ok(value),
            Err(error) => emit_err(error),
        },
        _ => {}
    }

    let operation_help_requested = argv
        .iter()
        .skip(1)
        .any(|token| token == "--help" || token == "-h");
    if operation_help_requested {
        let operation = argv
            .get(1)
            .and_then(|resource| operation_for(&initial_name, resource))
            .or_else(|| operation_for_command(&initial_name));
        if let Some(operation) = operation {
            match operation_help_text(operation) {
                Ok(help) => {
                    print!("{}", help);
                    exit(0);
                }
                Err(error) => emit_err(error),
            }
        }
    }

    let argv = match desugar_resource_command(argv) {
        Ok(argv) => argv,
        Err(error) => emit_err(error),
    };
    let name = argv
        .first()
        .map(String::as_str)
        .unwrap_or(initial_name.as_str());

    // `sfb <path>` — no subcommand: open a folder or reveal a file in the running GUI. Only when the
    // first token names an existing/path-like target, so a mistyped command still falls through to
    // the unknown-command help below.
    if command_named(name).is_none() && looks_like_path(name) {
        open_or_reveal(name);
    }

    let cmd = match command_named(name) {
        Some(c) => c,
        None => emit_err(format!(
            "Unknown command '{}'. Try `sfb help` or `sfb api-resources`.",
            name
        )),
    };

    let parsed = match parse_args(cmd, &argv[1..]) {
        Ok(p) => p,
        Err(e) => emit_err(e),
    };

    match (cmd.run)(&parsed) {
        Ok(data) => emit_ok(data),
        Err(e) => emit_err(e),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn argv(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| value.to_string()).collect()
    }

    #[test]
    fn resource_command_rewrites_positionals_and_flag_aliases() {
        let rewritten = desugar_resource_command(argv(&[
            "find", "entries", "/tmp", "--name", "invoice",
        ]))
        .expect("resource syntax should resolve");
        assert_eq!(
            rewritten,
            argv(&["search", "--path", "/tmp", "--name", "invoice"])
        );

        let parsed =
            parse_args(command_named("search").expect("search command"), &rewritten[1..])
                .expect("rewritten arguments should parse");
        assert_eq!(parsed.require("path"), Ok("/tmp"));
        assert_eq!(parsed.require("query"), Ok("invoice"));
    }

    #[test]
    fn legacy_command_with_a_verb_name_stays_compatible() {
        let legacy = argv(&[
            "copy",
            "--source",
            "/tmp/report.pdf",
            "--dest-dir",
            "/tmp/archive",
        ]);
        assert_eq!(
            desugar_resource_command(legacy.clone()).expect("legacy syntax should resolve"),
            legacy
        );
    }

    #[test]
    fn every_command_has_exactly_one_canonical_operation() {
        assert_eq!(COMMANDS.len(), OPERATIONS.len());
        for command in COMMANDS {
            assert_eq!(
                OPERATIONS
                    .iter()
                    .filter(|operation| operation.command == command.name)
                    .count(),
                1,
                "{} must have exactly one canonical operation",
                command.name
            );
        }
    }

    #[test]
    fn resource_aliases_do_not_point_to_different_resources() {
        let mut resources = HashMap::new();
        for operation in OPERATIONS {
            for name in std::iter::once(operation.resource)
                .chain(operation.resource_aliases.iter().copied())
            {
                if let Some(existing) = resources.insert(name, operation.resource) {
                    assert_eq!(
                        existing, operation.resource,
                        "resource name or alias '{}' is ambiguous",
                        name
                    );
                }
            }
        }
    }
}
