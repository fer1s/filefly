# Changelog

All notable changes to this project are documented in this file.

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
