# Sito Homebrew Tap

Homebrew tap for [**Sito File Browser**](https://github.com/sito8943/sito-file-browser) — a macOS
file browser that ships an AI-friendly `sfb` command-line tool.

## Install

```bash
brew install --cask sito8943/tap/sito-file-browser
```

That's it — `brew` adds the tap automatically the first time. (Equivalent to
`brew tap sito8943/tap && brew install --cask sito-file-browser`.)

Installing does two things:

1. Puts **Sito File Browser.app** in `/Applications`.
2. Symlinks the embedded **`sfb`** CLI onto your `PATH`, so you can use it right away:

   ```bash
   sfb --help
   sfb list --path ~/Documents
   ```

## First launch (unsigned build)

The app is currently **not code-signed / notarized**, so macOS Gatekeeper blocks the first launch.
Clear the quarantine flag once, right after installing:

```bash
xattr -dr com.apple.quarantine "/Applications/Sito File Browser.app"
```

Or open it once via **right-click → Open** in Finder and confirm the dialog. After that it launches
normally.

## Update

```bash
brew upgrade --cask sito-file-browser
```

New releases are published automatically: each GitHub release rebuilds the Intel and Apple-Silicon
DMGs and pushes the updated cask here.

## Uninstall

```bash
brew uninstall --cask sito-file-browser        # remove the app + the sfb symlink
brew uninstall --zap --cask sito-file-browser  # also remove app settings & caches
```

## Requirements

- **macOS 14 (Sonoma) or later** — a single Apple-Silicon build covers Sonoma and Sequoia.
- **Apple Silicon and Intel** are both supported (the cask picks the right DMG for your Mac).

## What's in this tap

| Cask | Description |
|------|-------------|
| `sito-file-browser` | The Sito File Browser app + the `sfb` CLI. |

---

Issues and source: <https://github.com/sito8943/sito-file-browser>
