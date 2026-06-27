# README OF SITO FILE BROWSER

## 1. Clone the project

```bash
git clone https://github.com/sito8943/sito-file-browser.git
```

## 2. Requirements

### Node

This project targets **Node 22** (pinned in [`.nvmrc`](./.nvmrc)). Download: <https://nodejs.org/en/download>

> On Windows, just download the binary and install it. On Linux or macOS, use NVM:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

With NVM installed, run `nvm use` in the project root to switch to the version in `.nvmrc` (run `nvm install 22` first if you don't have it yet).

> You can also use [NVM for Windows](https://github.com/coreybutler/nvm-windows/releases/download/1.2.2/nvm-setup.exe) if you wish.

### Rust

Install: <https://www.rust-lang.org/tools/install>

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

> On Windows, use the [Rust Windows installer](https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe).

### Curl (optional, only if you don't have it)

Download: <https://curl.se/windows/>

## 3. How to run?

Install all dependencies (only once per clone):

```bash
npm install
```

Run the frontend and the desktop app:

```bash
npm run tauri dev
```

This installs the Rust packages if they are not on disk yet; this happens only once.

## 4. macOS: Full Disk Access (for the Trash)

macOS protects some folders (like the **Trash**, `~/.Trash`) behind a privacy permission. Without it the app shows a "Can't read this folder" notice when you open the Trash, with a button to open the right settings pane.

To enable it:

1. Open **System Settings → Privacy & Security → Full Disk Access**.
2. Turn on the toggle for **Sito File Browser** (use the `+` to add it if it's not listed).
3. **Fully quit the app and relaunch it.** The app hides to the menu-bar tray on close, so reopening the window is not enough — quit it from the tray (or `Cmd + Q`) so macOS re-evaluates the permission on the next launch.

Notes:

- The permission applies per-executable, so the **production build** (installed `.app`) and a `tauri dev` run are treated separately. To test in dev, grant Full Disk Access to the **terminal app** that launches `npm run tauri dev` instead, then restart the terminal.
- Deleting files always moves them to the Trash (via macOS `NSFileManager`); this permission only affects **listing** the Trash contents inside the app.
