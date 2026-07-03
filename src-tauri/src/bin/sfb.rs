//! `sfb` — a headless, AI-friendly CLI over the file browser's operations.
//!
//! It links the app's library crate and calls the very same `filesystem` cores the GUI does, so
//! there is one source of truth for how files are listed, copied, and trashed. Everything is
//! machine-oriented: named `--flags` in, a JSON envelope out, deterministic exit codes.
//!
//!   { "ok": true,  "data": <result> }   → exit 0
//!   { "ok": false, "error": "<msg>" }   → exit 1
//!
//! An agent discovers the full surface without docs via `sfb schema`, which emits every command
//! and its arguments as JSON. The command table below is declarative: add a row, get a command,
//! its help, and its schema entry for free.

use std::collections::HashMap;
use std::path::PathBuf;
use std::process::exit;

use serde_json::{json, Value};

use sito_file_browser_lib::filesystem::{fs, tags};

// ---- Command table (declarative registry) ----------------------------------------------------

// One CLI argument. `takes_value = false` marks a boolean flag (present or absent, no value).
struct ArgSpec {
    name: &'static str,
    required: bool,
    takes_value: bool,
    description: &'static str,
}

// One CLI command. `run` receives the parsed args and returns the JSON payload (or an error string
// that becomes the `error` field). Grouped only for the help listing.
struct Command {
    name: &'static str,
    group: &'static str,
    summary: &'static str,
    args: &'static [ArgSpec],
    run: fn(&Parsed) -> Result<Value, String>,
}

// Shorthands to keep the table readable.
const fn val(name: &'static str, required: bool, description: &'static str) -> ArgSpec {
    ArgSpec { name, required, takes_value: true, description }
}
const fn flag(name: &'static str, description: &'static str) -> ArgSpec {
    ArgSpec { name, required: false, takes_value: false, description }
}

const COMMANDS: &[Command] = &[
    // -- Read -------------------------------------------------------------------------------
    Command {
        name: "list",
        group: "read",
        summary: "List the entries directly inside a directory.",
        args: &[val("path", true, "Directory to list.")],
        run: |a| {
            let entries = fs::read_directory(a.require("path")?)?;
            to_value(&entries)
        },
    },
    Command {
        name: "info",
        group: "read",
        summary: "Metadata for a single file or directory.",
        args: &[val("path", true, "Path to inspect.")],
        run: |a| {
            let entry = fs::get_entry(a.require("path")?.to_string())?;
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
            fs::rename_entry(path.to_string(), name.to_string())?;
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
            let created = fs::create_folder(a.require("parent")?.to_string())?;
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
    // -- UI (drive the running GUI over the control socket) ---------------------------------
    Command {
        name: "ui-state",
        group: "ui",
        summary: "Report the running app's live UI (open windows, tabs, current path, view).",
        args: &[],
        run: |_a| ui_call("get-state", json!({})),
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
        name: "ui-probe",
        group: "ui",
        summary: "Drag-drop + sidebar diagnostics (DEBUG-ONLY: run the app with --debug/SFB_DEBUG=1).",
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

// Parse the tokens after the command name using the command's spec: `--value-arg X` consumes the
// next token; `--flag` stands alone. Rejects unknown flags, missing values, and absent required
// args so a mistyped call fails loudly instead of silently doing the wrong thing.
fn parse_args(cmd: &Command, tokens: &[String]) -> Result<Parsed, String> {
    let mut values = HashMap::new();
    let mut flags = Vec::new();

    let mut i = 0;
    while i < tokens.len() {
        let token = &tokens[i];
        let key = token
            .strip_prefix("--")
            .ok_or_else(|| format!("Expected a --flag but got '{}'", token))?;
        let spec = cmd
            .args
            .iter()
            .find(|a| a.name == key)
            .ok_or_else(|| format!("Unknown argument --{} for command '{}'", key, cmd.name))?;

        if spec.takes_value {
            let value = tokens
                .get(i + 1)
                .ok_or_else(|| format!("--{} needs a value", key))?;
            values.insert(key.to_string(), value.clone());
            i += 2;
        } else {
            flags.push(key.to_string());
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
    Ok(home()?.join("Library/Caches").join("com.sito8943.file-browser"))
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

// Machine-readable description of every command, for `sfb schema`.
fn schema() -> Value {
    let commands: Vec<Value> = COMMANDS
        .iter()
        .map(|cmd| {
            let args: Vec<Value> = cmd
                .args
                .iter()
                .map(|a| {
                    json!({
                        "name": a.name,
                        "required": a.required,
                        "takesValue": a.takes_value,
                        "description": a.description,
                    })
                })
                .collect();
            json!({
                "name": cmd.name,
                "group": cmd.group,
                "summary": cmd.summary,
                "args": args,
            })
        })
        .collect();
    json!({
        "tool": "sfb",
        "envelope": { "ok": "bool", "data": "present when ok", "error": "present when !ok" },
        "commands": commands,
    })
}

// Human-readable help, grouped like the registry.
fn help_text() -> String {
    let mut out = String::from(
        "sfb — headless file-browser CLI (JSON out).\n\nUsage: sfb <command> [--arg value ...]\n\n",
    );
    for group in ["read", "write", "delete", "tags", "ui"] {
        out.push_str(&format!("{}:\n", group));
        for cmd in COMMANDS.iter().filter(|c| c.group == group) {
            let names: Vec<String> = cmd
                .args
                .iter()
                .map(|a| {
                    if a.takes_value {
                        format!("--{} <v>", a.name)
                    } else {
                        format!("--{}", a.name)
                    }
                })
                .collect();
            out.push_str(&format!("  {:<14} {}\n", cmd.name, cmd.summary));
            if !names.is_empty() {
                out.push_str(&format!("  {:<14} args: {}\n", "", names.join(" ")));
            }
        }
        out.push('\n');
    }
    out.push_str("meta:\n  schema         Emit all commands and args as JSON (for agents).\n  help           Show this help.\n");
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

    let name = match argv.first() {
        Some(n) => n.as_str(),
        None => {
            print!("{}", help_text());
            exit(0);
        }
    };

    match name {
        "help" | "--help" | "-h" => {
            print!("{}", help_text());
            exit(0);
        }
        "schema" | "--schema" => emit_ok(schema()),
        _ => {}
    }

    let cmd = match COMMANDS.iter().find(|c| c.name == name) {
        Some(c) => c,
        None => emit_err(format!("Unknown command '{}'. Try `sfb help`.", name)),
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
