# Homebrew Cask for Sito File Browser.
#
# This file is the canonical template. On each GitHub Release the `update-homebrew-cask.yml`
# workflow regenerates it with the new version + real sha256 sums and pushes it to the tap repo,
# so end users install with:
#
#   brew install --cask sito8943/tap/sito-file-browser
#
# The `app` stanza installs the .app to /Applications; the `binary` stanza symlinks the embedded
# `sfb` CLI into $(brew --prefix)/bin — which is already on PATH — so `sfb` just works after install.
# One arm64 .dmg covers both Sonoma (14) and Sequoia (15); the x64 .dmg covers Intel Macs.
cask "sito-file-browser" do
  arch arm: "aarch64", intel: "x64"

  version "0.3.0"
  sha256 arm:   :no_check, # replaced by CI with the real .dmg sums on release
         intel: :no_check

  url "https://github.com/sito8943/sito-file-browser/releases/download/v#{version}/Sito.File.Browser_#{version}_#{arch}.dmg"
  name "Sito File Browser"
  desc "File browser with an AI-friendly `sfb` CLI"
  homepage "https://github.com/sito8943/sito-file-browser"

  depends_on macos: :sonoma

  app "Sito File Browser.app"
  # Symlink the embedded CLI onto PATH. `target: "sfb"` names the command; the source is the
  # sidecar Tauri placed inside the bundle.
  binary "#{appdir}/Sito File Browser.app/Contents/MacOS/sfb", target: "sfb"

  zap trash: [
    "~/Library/Application Support/com.sito8943.file-browser",
    "~/Library/Caches/com.sito8943.file-browser",
  ]
end
