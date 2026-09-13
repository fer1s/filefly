# Sito File Browser - Project Context

Last reviewed: 2026-08-09

This is the navigation map for agents working in this repository. It exists to avoid a full-repo
study at the start of every task. Read this file, then inspect only the owning files named for the
requested flow. Source code remains authoritative when details drift.

## Product

Sito File Browser is a Tauri desktop file explorer with:

- local filesystem browsing and operations;
- tabs with per-tab navigation history, search, scroll position, and panel state;
- grid/list views, previews, Properties, Finder tags, context menus, and keyboard navigation;
- removable-volume handling and macOS Full Disk Access recovery;
- SFTP browsing and native macOS SMB mounts;
- persistent settings, sidebar groups, folder view preferences, and keybindings;
- an `sfb` sidecar CLI that shares Rust filesystem cores with the GUI;
- a local control socket used by `sfb ui-*` and optional automation.

The product version comes from `package.json`. At this review it is `0.8.0`.

## Technology

- Frontend: React 19, TypeScript 6, Vite 8.
- Desktop/backend: Tauri 2 and Rust 2021.
- Router: React Router 6.
- UI base: `@sito/ui`, wrapped by repository-local elements and patterns where Tauri-specific
  behavior is needed.
- Icons: Font Awesome through the local `Icon` abstraction.
- Styling: plain CSS with global design tokens; no Tailwind.
- Repository documentation and `package.json` scripts use npm commands. The tree also contains
  `pnpm-lock.yaml` and `bun.lockb`, so do not change package-manager conventions or regenerate
  lockfiles without explicit developer direction.
- Expected Node version: Node 22 via `.nvmrc`.
- macOS has the richest integration; Windows/Linux branches must remain explicit and safe.

Do not infer readiness from these versions. Validation is static unless the developer explicitly
authorizes execution.

## Required architecture contract

`ARCHITECTURE_RULES.md` is mandatory before code changes. Its central rules are:

- feature-sliced frontend under `src/features`;
- genuinely cross-feature code under `src/shared`;
- app composition and routing under `src/app`;
- managers/providers own orchestration and domain side effects;
- presentational components consume state/actions instead of calling services directly;
- one non-trivial hook/component per file with sibling `types.ts`, `constants.ts`, or `utils.ts`;
- centralized route constants, typed models, i18n, and semantic constants;
- component CSS mirrors the component tree and uses tokens from `src/styles/theme.css`.

## Runtime composition

The normal window starts at `src/app/main.tsx`:

```text
src/app/main.tsx
  BrowserRouter
    ConnectionsProvider
      App
        StateProvider
          Modal/Tags/Keymap/Hotkey/Confirm/... providers
            SettingsProvider
              SideBar
              AppContent
```

`src/app/main.tsx` also detects detached `preview` and `properties` panel query parameters and
renders the corresponding minimal window instead of the full browser.

`src/app/App.tsx` is the composition root. It creates `FileSystemManager`, loads app settings,
owns `useTabs` and `useDirectoryContents`, wires global providers, mirrors UI state to Rust, and
reveals the initially hidden Tauri window after settings and first content are ready.

`src/app/AppContent.tsx` owns the visible shell:

- `TabBar`;
- `PathBar`;
- `QuickBar` for directory routes;
- `/` -> `Volumes`;
- `/directory` -> `Directory`;
- `InfoPanel` for directory routes.

Routes are defined only in `src/app/routes.ts`.

## Navigation and directory-loading flow

The core path is:

```text
user navigation
  -> useTabs.setPath / goBack / goForward
  -> active tab path changes
  -> useDirectoryContents
  -> FileSystemManager.readDirectory
  -> src/shared/services/api.ts
  -> Tauri read_directory
  -> src-tauri/src/filesystem/fs.rs
  -> directory entries return to React state
  -> DirectoryProvider derives visible entries and feature state
  -> Directory / EntriesView renders them
```

Owners:

- Tab state/history/session persistence: `src/features/tabs/hooks/useTabs/useTabs.ts` and
  `src/features/tabs/utils.ts`.
- Directory load, access-denied handling, loading/stalled state, focus refresh, and watchers:
  `src/app/hooks/useDirectoryContents/useDirectoryContents.ts`.
- Cross-feature filesystem API: `src/shared/managers/FileSystemManager.ts`.
- Tauri invoke/listen/channel wrappers: `src/shared/services/api.ts`.
- Directory domain state: `src/features/directory/providers/DirectoryProvider`.
- Directory surface and interaction wiring: `src/features/directory/Directory.tsx`.
- Visible entries, batching, lazy rendering, and tag loading:
  `src/features/directory/components/EntriesView`.
- Local directory metadata/listing: `src-tauri/src/filesystem/fs.rs`.

Important contracts:

- `""` represents the Volumes route, not a filesystem path.
- Recents and Finder-tag paths are virtual listings and must not be passed through normal local
  directory watchers or size indexing.
- `sftp://` paths route to the SFTP backend.
- A navigation load is guarded so a stale result cannot overwrite a newer path.
- Slow navigation shows the app loader; a long stalled mount shows an escape notice.
- `ACCESS_DENIED` is a navigation failure. `App.tsx` leaves through tab history or Volumes instead
  of stranding the tab on the protected path.
- Local directory listing and other blocking filesystem work belong on a blocking worker, never on
  Tauri's main thread.

## Watchers and directory sizes

There are two distinct watcher purposes:

- `api.watchDirectory` uses `@tauri-apps/plugin-fs` non-recursively to refresh the visible listing
  when direct children change.
- `watchDirSizes` calls `src-tauri/src/watcher.rs`, which watches recursively and keeps the SQLite
  directory-size index accurate for Properties and the optional Size column.

Directory-size ownership:

- UI calculation/state: `src/features/directory/hooks/useDirSizes.ts`.
- Frontend in-memory cache: `src/features/directory/hooks/dirSizeCache.ts`.
- Persistent SQLite cache and recursive indexing: `src-tauri/src/index.rs`.
- Live recursive updates: `src-tauri/src/watcher.rs`.
- Ignore rules: `src-tauri/src/ignore.rs` plus the mirrored Settings contract.

Recursive walks and native watcher registration can be expensive. They must be asynchronous from
the UI's perspective. Frontend cancellation does not automatically cancel Rust work that has
already started.

## Directory feature ownership

`src/features/directory` owns:

- list/grid entries, selection, marquee selection, keyboard/typeahead navigation;
- copy, cut, paste, move, rename, trash, permanent delete, new folder, archive operations;
- context menus and quick actions;
- previews for image, audio, video, PDF, and Markdown;
- Properties and InfoPanel;
- folder sizes, thumbnails, tags, drag/drop, writability, search, sort, columns, and zoom.

Start with `DirectoryProvider` for shared directory state and `Directory.tsx` for surface
orchestration. Leaf components should not create new global state or call Tauri directly.

Current-folder Properties cannot be derived from `dirContent`, because that contains the folder's
children. It uses the backend `get_entry` path and reuses the existing Properties flow.

Typeahead feedback reuses `useKeyboardNav`; do not add a second keyboard listener.

## Frontend feature map

- `src/features/connections`: SFTP connection state and SMB orchestration. The durable SMB owner is
  `ConnectionsProvider`, supported by `ConnectionsManager` and `SmbManager`.
- `src/features/directory`: directory domain and views.
- `src/features/navigation`: path bar, crumbs, and path search.
- `src/features/quickbar`: directory quick actions.
- `src/features/settings`: schema-driven Settings UI, provider, and manager.
- `src/features/shortcuts`: shortcut-help UI/catalog integration.
- `src/features/sidebar`: sidebar groups, pinned folders, volumes, locations, connections, resize,
  editing, and sidebar context actions.
- `src/features/tabs`: tabs, history, tab shortcuts, and persisted per-window sessions.
- `src/features/volumes`: volume view/cards and volume actions.

Cross-feature infrastructure belongs in `src/shared`, notably:

- `shared/components/elements`: small domain-agnostic primitives;
- `shared/components/patterns`: reusable compositions such as dialogs, popups, menus, and toasts;
- `shared/keymap`: app keymap/scopes backed by the shared `@sito/commands` hotkey dispatcher;
- `shared/managers/FileSystemManager.ts`: filesystem domain boundary;
- `shared/providers`: modal, confirm, picker, tags, archive, and app-state providers;
- `shared/services/api.ts`: the frontend/Tauri boundary;
- `shared/models`, `shared/search`, `shared/utils`, and `shared/constants.ts`.

Context-menu layout and user-defined process actions are persisted separately from app settings in
`context_menu.toml`. The editor lives under the Settings custom controls and routes through
`SettingsManager`; loading/rendering remains owned by the directory action registry and
`useContextMenuLayout`, while `src-tauri/src/functions/context_menu.rs` validates, saves, broadcasts,
and executes configured actions. Custom commands run directly with an argv list (never through a
shell) and support path placeholders; virtual/remote/Trash entries do not expose them.

## Settings contract

Settings are persisted by Rust in `settings.toml`. A settings change normally crosses all of:

1. `AppSettings` in `src/shared/services/api.ts`;
2. frontend defaults/constants where applicable;
3. `src/features/settings/schema`;
4. `src/features/settings/providers/SettingsProvider`;
5. `src-tauri/src/functions/settings.rs`;
6. `src/lang/en.ts`;
7. the consuming hook/component.

Do not change only the visible control or only the Rust default.

Per-folder columns, view, sort, and zoom are stored separately through
`src-tauri/src/functions/folder_columns.rs`.

The Storage section also hosts the cleanup watch list, which is **not** part of that contract: the
folders the user registered to watch and reclaim live in `cleanup.toml` through
`src-tauri/src/functions/cleanup.rs`, reached from the UI via `SettingsManager`. Adding or cleaning a
folder is not a settings write, so it skips the seven-step alignment above. Cleanups always move
items to the system Trash (never a permanent delete), and `cleanup.rs` re-validates the target
immediately before deleting — refusing OS-owned trees, volume roots, the home dir, and any ancestor
of the app config dir.

Editable keybindings route through `src/shared/keymap`, Settings schema, and
`src-tauri/src/functions/keymap.rs`; preserve platform overrides when writing one binding.

## Remote and platform paths

SFTP:

- frontend/API path scheme: `sftp://<connection>/<path>`;
- feature state: `src/features/connections`;
- backend: `src-tauri/src/filesystem/sftp.rs`;
- saved non-secret fields: `connections.toml`;
- macOS secrets: OS Keychain;
- remote files are materialized into a local cache before OS open/preview where required.

SMB:

- saved logical path: `smb://host/share#label`;
- orchestration owner: `ConnectionsProvider` and `SmbManager`;
- backend diagnostics/mount lookup: `src-tauri/src/filesystem/smb.rs`;
- macOS performs native authentication/mounting and exposes the share under `/Volumes`;
- do not duplicate SMB connection state in `SideBar.tsx`.

macOS-specific behavior includes Finder tags/xattrs, Full Disk Access, Dock menu, Trash semantics,
native SMB, Keychain secrets, terminal opening, preview generation, and folder-handler integration.
Use explicit `cfg`/platform branches and return errors instead of panicking.

## Rust map

- `src-tauri/src/main.rs`: Tauri builder, managed state, plugins, command registration, window
  lifecycle, opened URLs, and startup background work.
- `src-tauri/src/lib.rs`: shared library exports for the GUI and CLI.
- `src-tauri/src/bin/sfb.rs`: headless JSON CLI and UI-control commands.
- `src-tauri/src/filesystem/fs.rs`: local listing, metadata, search, thumbnails, open/copy/move/
  rename/create/delete/restore operations.
- `src-tauri/src/filesystem/archive.rs`: archive compression/extraction.
- `src-tauri/src/filesystem/sftp.rs`: SSH/SFTP connections, remote operations, keychain, cache.
- `src-tauri/src/filesystem/smb.rs`: SMB diagnostics and native mounts.
- `src-tauri/src/filesystem/tags.rs`: Finder tags.
- `src-tauri/src/filesystem/volumes.rs`: mounted volumes and host information.
- `src-tauri/src/index.rs`: persistent recursive directory-size index.
- `src-tauri/src/watcher.rs`: live recursive size-index watcher.
- `src-tauri/src/functions`: settings, sidebar, keymap, context menu, terminal, control socket,
  storage, cleanup watch list, clipboard, system integration, and folder preferences.
- `src-tauri/src/window.rs`: normal and detached Tauri windows.

The GUI and `sfb` CLI intentionally reuse plain Rust core functions. Put reusable filesystem
behavior in the core, then keep the Tauri command and CLI as adapters.

## UI, CSS, and translations

- Import shared theme/global CSS from `src/app/main.tsx`.
- Reuse `@sito/ui` through repository-local wrappers when local Tauri behavior is required.
- `Icon` is the centralized Font Awesome renderer.
- Place component CSS under `src/styles/components` and view CSS under `src/styles/views`.
- Use variables from `src/styles/theme.css`; do not introduce raw design literals when a token
  exists.
- The active translation dictionary is `src/lang/en.ts`, exported through `src/lang/index.ts`.
- User-facing strings belong in the translation dictionary, not inline or in constants.

## CLI and control channel

`sfb` is a sidecar binary sharing the Rust filesystem cores. Its canonical grammar is
`sfb <verb> <resource> [target ...] [--options]`; the older flat command names remain aliases that
resolve to the same declarative registry entries. `api-resources`, `explain`, `schema`, and `help`
are generated from that registry. Its public behavior and installation notes are documented in
`README.md`.

The GUI exposes a Unix socket in the app config directory:

- normal automation commands can inspect state or navigate/open windows;
- deeper `ui-probe` introspection is debug-only;
- release/debug security boundaries are documented in `README.md` and implemented in
  `src-tauri/src/functions/control.rs`.

Do not execute `sfb` from an agent session unless the developer explicitly authorizes it.

## Task routing table

| Request                                              | Start here                                                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Navigation, Back/Forward, tabs, scroll restoration   | `src/features/tabs/hooks/useTabs`, `src/features/tabs/utils.ts`                         |
| Folder load, spinner, stalls, access denied, refresh | `src/app/hooks/useDirectoryContents`                                                    |
| Entry list/render/selection                          | `src/features/directory/Directory.tsx`, `DirectoryProvider`, `EntriesView`              |
| File operations                                      | directory actions/hooks -> `FileSystemManager` -> `api.ts` -> Rust filesystem core      |
| Context-menu layout/custom process actions           | directory action registry, Settings custom-action editor, `functions/context_menu.rs`   |
| Preview or Properties                                | `src/features/directory/components/Preview` or `Properties` and their hooks             |
| Folder sizes/watchers                                | `useDirSizes.ts`, `src-tauri/src/index.rs`, `src-tauri/src/watcher.rs`                  |
| Thumbnails                                           | `DirEntry` thumbnail hooks and `src-tauri/src/filesystem/fs.rs`                         |
| Settings                                             | Settings schema/provider, `api.ts`, `src-tauri/src/functions/settings.rs`, translations |
| Disk usage / cleanup watch list                      | `controls/StorageBelow`, `controls/CleanupBelow`, `functions/storage.rs`, `cleanup.rs`  |
| Keyboard shortcuts                                   | `src/shared/keymap`, `src/features/shortcuts`, keymap Settings schema                   |
| Sidebar                                              | `src/features/sidebar`; network orchestration remains in `ConnectionsProvider`          |
| SFTP                                                 | `src/features/connections`, `api.ts`, `src-tauri/src/filesystem/sftp.rs`, `SSH_PLAN.md` |
| SMB                                                  | `ConnectionsProvider`, `SmbManager`, `src-tauri/src/filesystem/smb.rs`                  |
| Volumes/eject/NTFS                                   | `src/features/volumes`, directory writability hook, Rust volumes/system functions       |
| Tauri windows, Dock, opened URLs                     | `src-tauri/src/main.rs`, `window.rs`, `dock_menu.rs`                                    |
| Shared UI primitive                                  | local `shared/components` wrapper first, then inspect `@sito/ui` contract               |

## Documentation routing

- `README.md`: setup, run/build instructions for the developer, CLI, control channel, macOS access.
- `ARCHITECTURE_RULES.md`: mandatory code organization and CSS contract.
- `Features.md`: high-level product checklist; it may lag implementation.
- `SSH_PLAN.md`: SFTP architecture and remaining remote-edit phases.
- `plans/SIZE_INDEX_PORT_PLAN.md`: size-index portability work.
- `plans/SPLIT_SCREEN_PLAN.md`: split-screen proposal.
- `plans/done`: historical migrations and completed plans; do not read them unless the request is
  specifically about that history.
- `CHANGELOG.md`: released behavior/history.

## Static-only verification boundary

Agents must not run the repository scripts or project executables without explicit permission.
Allowed static checks do not prove runtime behavior:

- `git status --short`;
- `git diff`, `git diff --stat`, `git diff --check`;
- `rg` and direct source/config reads;
- `git log`, `git show`, and `git blame` when history is relevant.

When handing work back, state that build, lint, tests, and runtime reproduction were not run.
