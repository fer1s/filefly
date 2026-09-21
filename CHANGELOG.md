# Changelog

All notable changes to this project are documented in this file.

## [0.11.1]

### Added

- Audio playback progress highlights the played portion with the theme's accent colour, updating during playback and when seeking (`7cd620b`)

### Changed

- Audio previews share the floating controls bar used by other previews, with matching pill shape, transparency, shadows and buttons. Previous, Next and Trash actions now sit alongside playback, progress and volume controls (`7528c86`)

### Fixed

- Previews track the opened file by its path instead of its position in the list, preventing directory refreshes or sorting changes from switching the preview to another file. Removing the previewed file still advances to a neighbouring entry (`ee7823c`)
- Audio progress and volume slider thumbs are vertically centred on their tracks (`e140848`)

## [0.11.0]

### Added

- Settings › Files › File types: map any extension onto a built-in file type (e.g. `opus` → Audio). The type — not a hand-picked icon — decides the entry glyph, whether the file is thumbnailed, and whether the built-in preview opens it, so a remapped extension behaves exactly like a built-in one. The full default map is seeded into `settings.toml` and editable there; an extension may belong to only one type and the editor rejects (and explains) a duplicate
- Image previews gain 90° left/right rotation controls alongside zoom, in both the in-app panel and detached window. Rotated images fit the viewport and retain zoom and pan support; rotation is temporary and resets when switching files or reopening the preview (`744d0d5`)
- Rotated image previews expose "Copy image for current state" in the context menu: copy the full image with its current orientation, respecting embedded EXIF orientation and leaving the original file untouched. "Copy image" remains available for the original; decoding, rotation and clipboard writes run on a worker (`744d0d5`)
- Settings › Files › File types gains "Colorful file types": optionally colour file icons in list and grid views using the category palette. The choice is persisted and defaults to gray; folders and thumbnails keep their appearance (`9efab19`)

### Changed

- Settings: "Files & Transfers" is now "Files" and gathers everything about how files are treated — File types, Previews & windows and Folder sizes moved there from General, which was carrying 21 settings across 8 sub-headings
- File types are presented as responsive category cards with coloured icons, descriptions, extension chips and an inline Add editor for each category (`085aede`)
- The active tab joins a bordered content panel, visually grouping navigation, actions and the directory under their owning tab (`03173d7`)
- Navigation and quick-action bars gain subtle backgrounds and rounded borders; the Home button follows Back, Forward and Up (`94ea8a9`, `f5667cb`, `0296735`)
- Directory listings gain a rounded frame, larger rows and thumbnails, and a full selection outline alongside the accent strip (`2ce7b20`)
- The quick-action bar shows the active sort criterion in a labelled menu on the right, reusing the existing folder sorting choices (`d760aca`)
- Item counts and optional system statistics share a framed status row, wrapping when space is limited (`859a679`)
- Folder search stays visible in the navigation bar. The search shortcut focuses the field; Escape clears the filter and releases focus, while recent searches remain available (`f5a5766`)
- Separate List and Grid buttons replace the single view toggle and highlight the active view; the existing toggle shortcut remains available (`7cca898`)

### Fixed

- Context menus no longer highlight one row under the pointer and another with keyboard focus at the same time. Pointer movement and keyboard navigation share a single focused row, including submenu items (`744d0d5`)
- The list header background extends across the directory's side gutters to the edges of the scrollable area, keeping column labels aligned with the file rows

## [0.10.2]

### Fixed

- Context-menu submenus did nothing when picked — Compress › To zip / To 7z, Sort By, New File, and every other submenu row. The flyout is portaled to `<body>` to escape the menu's `overflow`, so it sits outside the element the outside-press handlers test containment against: the press dismissed the whole menu on `mousedown` and the row unmounted before its `click` could fire. `useContextMenu` and `useContextMenuState` now treat a press inside `.context_menu_submenu` as a press inside the menu
- Clicking an actionable toast (the "reveal the archive" toast after compressing, and the like) could drop the action — the global "any interaction dismisses" `pointerdown` handler fired on the toast itself, starting the exit animation under the cursor so the toast slid out from under the pending `mouseup`. Presses on a toast are now left to that toast's own click handler

## [0.10.1]

### Fixed

- `src-tauri/tauri.conf.json` version was left at `0.9.1` when 0.10.0 was cut, so the packaged dmg was named `..._0.9.1_....dmg` while the release tag/cask expected `..._0.10.0_....dmg` — Homebrew upgrades 404'd. Version file now kept in sync with `package.json`.

## [0.10.0]

### Added

- `sfb` CLI gains custom context-menu actions: `sfb get actions` lists the user's actions (id, label, targets, extensions, enabled); `sfb run action --id ... --path ... --force` runs one exactly as the GUI would, sharing the same `filesystem::actions` core as `functions::context_menu` (`0e68a3d`)
- Export/Import for custom context-menu actions — Settings › Context Actions can save the user's custom actions to a shareable `context-actions.json` and import one back; imported entries are validated (label/command/target required, unknown icons fall back to default) and get freshly generated ids so a shared bundle never collides with a local action (`04323ef`)

### Changed

- Right-click "Inspect Element" works again in dev builds — the app's context-menu override (which replaces the OS/webview menu everywhere) is skipped when `import.meta.env.DEV` (`e4f1e3b`)

### Fixed

- Leaving a folder while an inline rename was in progress no longer leaves it resumed on return — navigating to a new path now clears `renamingID` alongside the stale selection (`d8e4045`)

## [0.9.1]

### Fixed

- Dialogs (Settings, Shortcuts, confirmations, …) no longer open shifted down and to the right in the packaged app. The code-split build loads the shared `Button`/`DialogHeader` CSS chunks before the main stylesheet, so `@sito/ui`'s same-specificity base rules (`.sito-ui-dialog { position: relative }`, `.sito-ui-button` height/padding/weight) beat the app's `.dialog` / `.Button` overrides. The package styles now live in a `@layer sito-ui` cascade layer, so every unlayered app rule wins regardless of stylesheet order or specificity; dialog centring is delegated to the flex backdrop instead of `position: fixed` + `top/left: 50%`
- Buttons in the packaged app return to their intended height, padding and font weight (same root cause as above)

## [0.9.0]

### Added

- Welcome guide — a first-launch onboarding wizard (appearance, essential shortcuts, sidebar, system integration) driven by a declarative step registry; a Settings toggle decides whether it shows on launch, and an "Open guide" button replays it anytime (`759c793`, `bb84140`)
- Update notifications — on launch the app compares the installed version with the latest GitHub release and shows a clickable toast when a newer one exists; Settings › General › Updates adds a "Check now" row with the release link and the Homebrew upgrade command. Read-only: nothing is downloaded or installed (`435d9f0`)
- What's new after an update — the first launch on a newer version shows a clickable toast that opens the bundled release notes (this `CHANGELOG.md`, rendered in-app, with a version picker); Settings › General › Updates adds a "Show changelog" row and a toggle for the post-update toast. Fresh installs get the welcome guide instead, never both (`a93ac91`, `972d487`)
- Cleanup watch list — register folders (dependency caches, build artifacts) in Settings › Storage and reclaim them on demand, either emptying their contents or trashing the folder itself; OS-owned paths are refused (`1d181a1`)
- Custom context-menu actions — user-defined process commands appended to the entry context menu, saved in `context_menu.toml` and executed with argv (never through a shell), with `{paths}` and scalar placeholders (`7106d48`)
- Grid icon size — a Finder-style "Icon size" setting that scales grid tiles and their icons independently of the per-folder zoom; list view only nudges the icon (`266b840`)
- Full keyboard navigation in context menus (arrow keys, submenus) through the shared `@sito/ui` menu primitive (`4d09119`)
- Committing a file path in the path bar navigates to its folder and reveals the file once the listing loads (`15c42ed`)

### Changed

- Hotkey registration and dispatch now run on `@sito/commands`, replacing the in-house keymap dispatcher (`5510d0e`)
- Clicking the Dock icon while the app has no visible window restores the hidden main window, or opens a new browser window if all were closed (`9fd7a35`)
- Network group with no saved connections exposes the SSH/SMB chooser directly; sidebar add actions and dialog submit buttons use the shared Button variants (`1282918`)
- Folder-size cache keeps the directory mtime and ignore-rules key with each size so an unchanged folder skips the backend lookup within a session (`f707afe`)
- Settings loaded from disk are merged over the defaults, so a file written by an older build never leaves newer keys undefined (`bb84140`)
- Routing moved from `react-router-dom` 6 to `react-router` 7.18 (same declarative API), clearing the open-redirect / SSR advisories against v6; `postcss` and `brace-expansion` bumped past their advisories, and `russh` 0.62.5 / `serde_with` 3.21 merged from Dependabot (`e200c76`)
- Rarely-opened surfaces are now code-split and loaded on first open — Settings, Preview, Properties, the connection/SMB/auth dialogs, compress/password dialogs, the welcome guide, release notes and the shortcuts sheet — plus the detached preview/properties panel windows; startup JS drops from 697 kB to 616 kB (`shared/components/patterns/Deferred`, `540e5e3`)
- `@sito/commands` is consumed from its public git tag (`v0.1.0-alpha.1`) instead of a local path, so CI can install it (`9adc3b7`)
- Architecture rules rewritten to match the codebase (registries, settings contract, dialogs/hotkeys, launch lifecycle) and the remaining cross-feature deep imports routed through public `index.ts` files (`188ab49`, `140e479`)

### Fixed

- List view: hidden columns (e.g. Kind in Pictures, whose default hides it) no longer leak a stray "File"/"Directory" label under each row — the hide rules lost a CSS specificity tie against the cell's `display: flex` (`4af28e4`)
- Sidebar section titles no longer overlap the group chevron while the sidebar animates open (`7dee05c`)
- The "open in new tab" button on connection rows no longer shows in the collapsed icon rail (`8e64f64`)
- Remote (SFTP) breadcrumbs keep their `sftp://<connection>` prefix, so clicking an ancestor crumb no longer produces a broken local path (`2c0d9b6`)
- Late background refreshes (e.g. a slow Recents query on window focus) can no longer replace the entries of the folder you have since navigated to (`47c7a46`)
- Dragging a remote (SFTP) entry out of the window is refused with a message instead of handing an invalid path to the native drag (`c21bacf`)
- Tooltips dismiss when their trigger row moves (e.g. while sorting by folder size) instead of floating detached (`540f5a2`)

## [0.8.0]

### Added

- Windows (SMB) network shares — browse SMB shares (e.g. a Windows VM) from the sidebar's Network group, with a chooser that adds either an SSH/SFTP connection or an SMB share, mount handling, and a redirect out of folders whose mount disappears (`7cdce45`)
- RAR extraction via the system 7-Zip binary — `.rar` files get Extract Here / Extract to Folder, including password detection for encrypted archives; extract actions for formats that need 7-Zip (7z, rar) hide themselves when no binary is on PATH (`2c80c6f`)
- Create a text file from the browser — a New File context-menu action, working locally and on remote (SFTP) folders (`3019305`)
- Zoom the current folder with Command/Ctrl + scroll wheel, behind a new setting (`904ddbd`)
- Breadcrumb context menus — right-clicking a path crumb opens a reduced folder menu; the path bar still switches to a raw editable path on click (`bee3149`)
- Resource-oriented `sfb` CLI syntax (`sfb <verb> <resource>`, e.g. `sfb trash file`) layered over the existing commands, with argument aliases and a machine-readable schema for agents (`32ef6db`)
- AI-agent docs — `AGENTS.md` and `PROJECT_CONTEXT.md` describing the architecture and conventions for coding agents (`e08513c`)

### Changed

- Emptying the Trash on macOS now delegates to Finder, which owns the progress UI and covers per-volume Trashes; other platforms keep the manual implementation (`7f4ffb2`)
- Home and the macOS TCC-protected folders are pre-warmed at launch, so the first navigation doesn't pay the consent round-trip and cold metadata cache (`cb9ef25`)
- Navigating into a folder the OS denies (e.g. the Trash without Full Disk Access) now bounces back to the previous folder — or Volumes — with an error toast that opens the Full Disk Access settings pane when clicked (`9fd1f63`, `06850ea`)
- Context-menu groups are separated with dividers, mirrored in the quick-actions bar (`5f39618`, `c75fb6d`)
- The Trash action is shown in the danger color (`bee3149`)
- Form controls started migrating to the shared `@sito/ui` component library (`afc1178`)

### Fixed

- Directory watcher now refreshes reliably on desktop when files change externally (`35e0a89`)
- Type-to-find now matches multi-character queries correctly while navigating with the keyboard (`1235935`)
- Deleting from a detached preview window now asks for confirmation, honoring the confirm-before-Trash setting like the main window (`91c4225`)

## [0.7.0]

### Added

- Folder image mosaics in grid view — at larger zoom levels, folders show up to four thumbnails from their direct image children, loaded lazily through the existing thumbnail queue and cache (`1583cbf`)
- Open folders in a new tab from entry actions, with a setting to control whether newly opened tabs are activated immediately (`ee4f1b2`)
- Open Containing Folder for entries shown outside their parent directory, including Recents and recursive search results (`4e31bdc`)
- Resizable column headers in list view (`4b93bff`)
- Per-history-entry scroll restoration when navigating Back or Forward, plus an optional setting to remember a parent's scroll position when navigating Up (`5fde13d`)

### Changed

- Quick Actions now exposes Sort as an anchored menu and uses context-aware action icons; folders use a dedicated Open icon (`ee4f1b2`)
- List view now displays file extensions inline as part of the filename (`574ab37`)
- Recents now queries Spotlight in progressively wider time windows, excludes directories and app-owned paths earlier, and caches results briefly to avoid redundant refreshes (`4e31bdc`)

### Fixed

- Type-to-find now mounts and scrolls to matching entries beyond the current lazy-render batch (`c6efb6d`)
- Plain Backspace no longer triggers the embedded browser's history navigation (`22e65d9`)
- Detached audio previews now use the application background instead of leaving the window surface unstyled (`cd9276b`)

## [0.6.0]

### Added

- Archive support — compress files/folders to `.zip` (optional password) and extract archives, with extract-here / extract-to-folder, entry actions, and context-menu wiring (`431cc4d`, `0e104ea`)
- 7-Zip archives — compress & extract via the system 7-Zip binary, with a compress/extract UI gated on 7z availability (`2b29b35`, `b7777d0`)
- Copy files to the OS clipboard the Finder way — a copied selection pastes as real files into file-aware apps (Finder, Mail) and as names into text fields (macOS multi-flavor `NSPasteboard`) (`c00d537`)
- Open properties in its own detached window — an `openPropertiesInWindow` setting, plus `sfb ui-properties` and a `properties` control action (`2cf1633`)
- Open an image preview in its own window (`422a16c`)
- Copy path — a context-menu action and keybinding that copy an entry's path (`84dcce8`, `71d804b`)
- Edit a saved SSH connection from the sidebar; the stored key path rehydrates the auth dialog (`0f19b2c`)
- Persistent notice when a remote folder fails to load, with a Retry — replaces the transient toast that left the folder deceptively empty (`ec3b4cc`)
- Indeterminate progress bar for operations without a byte total (`684e5ba`)
- Reload button on the dev error overlay (`6dad352`)
- `sfb ui-windows` and `ui-preview` control commands (`96e7c8a`)
- Remote write over SFTP, host-key verification, and Keychain-stored connection secrets (`642f272`)
- Shared UI element library — `Checkbox`, `Select`, `TextArea`, `TextInput`, `Slider`, `PasswordInput`; feature code is barred from raw form elements and routed through these primitives (`2065dd0`, `7c782e6`, `54440fd`, `dd6e01e`)

### Changed

- More macOS/Windows junk excluded from folder-size totals by default (`com.apple.chrono`, `.localized`, `.AppleDouble`, `Thumbs.db`, `desktop.ini`); ignore rules now match any path component, so deep watcher events under an ignored dir are dropped (`5419b0f`)
- Committing a file path in the path bar now opens the file (open routing centralized through the directory provider; the redundant Preview action is hidden when Open already previews) (`669a783`)
- Reordered the Compress action in the context menu — after Destroy, before Properties (`029f6c3`)

### Fixed

- Context-menu opacity now mirrors to portaled submenu flyouts (`7df372e`)
- Derive a file's extension from the last dot, not the first (`2076701`)
- Preview iframe background uses the app-background token (`d610f54`)

## [0.5.0]

### Added

- SSH/SFTP remote hosts — connect to and browse remote servers from a connections sidebar, with an add-connection flow, Keychain-stored credentials, and an auth dialog (`9f317dc`, `f0544c6`, `bbb6cee`, `33bafc7`, `1c46a85`)
- Remote file operations over SFTP — copy, move, delete, and rename on remote hosts (`d22aaa8`, `fcf28b5`)
- Streaming remote downloads with byte-by-byte transfer progress (`675fc97`, `5ed372e`, `f911a3b`)
- Recursive size calculation for remote folders (`0c39b1c`)
- Remote image thumbnails (`865ec7d`)
- Edit markdown files directly on remote hosts (`c62b709`)
- Open a remote folder in the terminal (`cbb81b1`)
- Automatic reconnection and SSH host-key verification (`365f71f`, `768ccda`)
- `sfb` headless CLI to drive the app, with a bundled sidecar script (`65c870e`, `3884bb3`, `6a976ce`)
- Live system stats (CPU / RAM / disk) in the status bar (`9d38c0e`)
- Recursive folder sizes in list view — a persistent on-disk size index kept fresh by a live filesystem watcher, shown in the Size column with severity-coloured bars and a Settings toggle (`febe51f`, `bdfbb5c`, `f8f0d05`)
- Folder-size ignore list — glob patterns excluded from size totals, pre-seeded on macOS with system junk (`.DS_Store`, `._*`, `.Spotlight-V100`, …) (`44ad8c1`)
- Shared Chip UI components — toggleable and deletable variants (`f65c0c0`)
- Reusable `SettingsButton` and shared dialog-action components (`7b6b5a3`, `fdd1331`)
- Open a folder or reveal a file from outside the app — `sfb <path>` (`sfb .`, `sfb file.pdf`), a `sito-file-browser://open|reveal` URL, or a file handed over by macOS (dock drop, Open With, `open -a`); revealed files are selected and scrolled into view (`2f7a330`, `84ebda6`)

### Changed

- Settings dialog — settings grouped into subsections and the dialog resized to 80% of the window (`44ad8c1`)
- Status-bar disk usage now opens macOS System Settings › Storage instead of a custom in-app breakdown (`1d2a01d`)
- Remote download cache is cleared automatically (`d65b9de`)
- Raised the maximum directory zoom to 500% (was 300%) (`22f633e`)

## [0.4.1]

### Added

- "Clear cache" action in the Storage settings panel (`0cc9e4b`)

### Fixed

- On first launch, clicking a tab triggered a drag instead of selecting it — a reorder now requires real pointer movement past a threshold (`1c5cd45`)
- Storage settings panel layout / UI (`0cc9e4b`)

## [0.4.0]

### Added

- Light theme with a light/dark theme switcher (`cff2bf8`)
- Accent colour palette — pick the app's accent colour (`c709c9e`, `a1bfd27`)
- Finder tag colours (`3da34d9`)
- Storage panel — the app's on-disk data locations and their sizes in Settings (`214ccb2`)
- "Default folder handler" toggle — make the app macOS's default folder opener (`ba403fa`)
- Custom in-app folder picker and file picker (`5505d0b`, `7a0b8c6`)
- Search filters (`95c98fb`)
- Built-in markdown preview + editor (`923e76d`)
- Preview panel find bar (`88e2ba8`)
- Preview panel resize / maximize (`1cd3438`)
- Draggable dialogs + macOS header sizing (`4d8eb38`)
- Transparency toggles (context menu / dialog / preview controls) and open-in-preview (`8d695b9`)
- Register the app as the system default file browser (`5a08b8f`)
- `sfb` headless UI control: tab commands and live UI-state probe (`d147202`, `d4b65b6`, `5911017`, `88e2ba8`)
- Dev error overlay (`5f87505`)
- Inline rename improvements (`66d0c8c`, `a0fe422`)

### Fixed

- Drag and drop: drop on empty space, drop on folder, entry drag, and sidebar drag (`e56963f`, `d4b65b6`, `261dad4`, `5505d0b`)
- Sidebar sticky positioning (`1bcf1e7`)
- Tab creation crash (`b799f56`)
- Clicking a tab no longer starts a reorder — a jittery click stays a click via a drag threshold (`6a10c64`, `ee9af2c`)
- Rename box unreadable on the light theme (was a dark scrim surface; now a solid theme surface) (`fed398a`)
- Dialog crash when closing via the header ✕ (a cancelled drag left `memo` undefined) (`008788f`)
- No hover state on disabled controls (`4d54e04`)
- Enter with cancellation on inline edits (`00426b1`)

### Refactored

`ARCHITECTURE_RULES.md` compliance pass across the React app:

- Design tokens — replaced literal CSS values with `theme.css` tokens (`8f7e027`)
- Unit-level file structure — extracted inline constants/types/helpers to sibling files (`cdc7a4f`)
- No magic literals — closed-set const objects and named constants (`18fd942`)
- Manager/provider access — added `SettingsManager`; filesystem drag and folder creation now go through `FileSystemManager` (`008788f`)

### Docs

- Architecture rules (`60ae26f`, `80cb738`, `b00956a`)

### Chore

- Format / lint (`25385f1`, `b00956a`)

## [0.3.0]

### Added

- Undo/redo (`35387fe`)
- Custom dock menu (`163b1ba`)
- Multiple windows support (`7eb69e5`)
- Movable tabs (drag to reorder) (`9cd1125`)
- `sfb` headless CLI sidecar sharing the filesystem cores (`47f2c9d`)
- Homebrew cask and macOS ARM build workflow (`47f2c9d`)

### Fixed

- First load (`ff3e0b3`)

### Changed

- Settings dialog rebuilt as schema-driven with sections, controls and navigation (`a03dcca`)

## [0.2.2]

### Fixed

- Native drag preview icons not showing in release builds (added `data:` to the `img-src` CSP so glyph rasterisation works in production)

## [0.2.0]

### Added

- Drag and drop (`7286e3a`)
- Drag and drop files to outside the app (`4d6d8e0`)
- Clickable toasts (`d4e1bae`)
- Confirmation dialog for move (`6515f9e`)
- Create sidebar group (`780b229`)
- Toggle pinned presets (`3324eac`)
- Resizable sidebar (`3ebce99`)
- Startup configuration (`d09abe3`)
- Movable tags (`6eb1624`)
- SVG thumbnails (`a8b09cf`)
- Optional phase (`d6c15e1`)
- Finder tags (`4128183`, `c056b3f`)
- Danger action on preview (`97cfd0f`)
- Array of key bindings (`0cf262f`)
- Hotkey dispatcher (`54ea00d`, `17165e0`, `223ef6b`)
- Plan recents (`852f5e2`)
- Confirmation dialog for delete (`83ea78e`)
- Add sidebar item (`446b6d3`)
- Edit mode (`e910cbf`)
- Rename sidebar (`dd17b51`)
- Scroll to created (`2ef5a86`)
- Search directory / Search Bar (`1e707b6`, `d4740a8`)
- Toggle toasts (`2ef4f86`)
- PathCrumbs (`d611c67`)
- Shortcut to see all keybindings (`2e7a46c`)
- File entry icon map (`25b0e71`)
- NTFS notice and events on volumes (`1407886`)
- macOS-style dialog (`5af3436`)
- Markdown previews (`80c6f45`)
- Restore file from trash (`84e36c8`)
- NTFS support (`7f1c1d8`)
- Settings / settings dialog / settings button (`472d486`, `4e02ab5`, `f25b64c`)
- Date format (`1e1d57a`)
- Sidebar context menu (`4247c33`)
- Recent spotlight (`f1c2272`)
- Show folder size on properties content (`f3ad1c8`)
- Tabbable UI / tabs / tab indexes (`9d2fda1`, `c9dadac`, `eefb104`)
- Context menu accessibility, roles and accessibility (`34a2b8b`, `81f9578`)
- Zoom control (`ddf9422`, `6701157`)
- Real size on properties (`681f557`)
- Tiling max for thumbnails (`56049b9`)
- PDF preview and thumbnails (`120e644`)
- Zoom in/out shortcuts (`46fea76`)
- Video previews (`b28018c`)
- Quick actions and new folder (`925fc36`)
- Dynamic actions for context menu (`53e3400`)
- Destroy context menu item (`3f2bc06`)
- Zoom (`3fdddf6`)
- Saving sort (`171eef9`)
- Toast and toggle hide/show hidden files (`1c5020d`)
- Columns align (`ae45753`)
- Collapsable sidebar groups (`ed7c7cb`)
- List headers toggle (`d5619b2`)
- Tooltips on collapsed sidebar (`a94e91a`)
- Shift click / Control A selection (`ebc3ce5`, `ec58a83`)
- Details metadata popup (`7f78b12`)
- Keymapping and TOML (`3c5bbd7`, `e57a714`)
- Tooltips (`12b2a3c`)
- Copy from properties (`ebd0475`)
- Generic button styles (`0917374`)
- File access for trash (`1a5825b`)
- `.nvmrc` (`4030445`)

### Fixed

- CSS fixes (`982752c`)
- Contextual menu height (`1808791`)
- Tab and back, no backspace (`a05b376`)
- Zoomable (`c9296b5`)
- `+` button styles (`fcbdb03`)
- Metadata tooltip (`1212d49`)
- Shift selection (`c410ed6`)
- Lag of trash and other screens (`faa8fdf`)
- Tooltip persistence (`a9614c1`)
- No previews for videos (`e84b19a`)
- Tooltip and select of PDF (`69fbb16`)
- Raw size of external device (`82ce1fc`)
- Zoom on images and zoom control (`3a095c3`)
- Add render batch (`c7faa79`)
- Watch (`91950a6`)
- Calculating sizes (`58521c1`)
- Long names on sidebar (`4b4ec54`)
- Selection box (`dbd7d74`)
- Toast interaction and size (`aca3698`)

### Changed

- Reduced CSS (`79f049a`)
- Cut 50% of opacity (`f030bfa`)
- Sidebar opacity (`7302496`)
- Styling inserts (`2f2da6b`)

### Refactored

- Startup configuration and refactor (`d09abe3`)
- Refactor (`7763e55`, `f3ad1c8`)
- Refactor dir entry (`4bc0516`)

### Docs

- Architecture rules (`d694b92`, `6eab344`, `23e8973`)
- Workflow (`6a5f566`)
- Updated plans (`4b1f6c1`)

### Chore

- Format / lint (`bdb8487`, `15490f0`, `0f3eb89`, `480173c`, `02ca933`, `3fdddf6`)
- pnpm (`2b302e2`)
