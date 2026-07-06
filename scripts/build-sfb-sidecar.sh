#!/usr/bin/env bash
# Build the `sfb` CLI and stage it as a Tauri sidecar so `tauri build` embeds it in the .app at
# Contents/MacOS/sfb. Tauri resolves externalBin "binaries/sfb" to `src-tauri/binaries/sfb-<triple>`,
# so the file MUST carry the target triple suffix and match the triple the app is built for.
#
# Usage:
#   scripts/build-sfb-sidecar.sh                     # host triple (local builds)
#   scripts/build-sfb-sidecar.sh x86_64-apple-darwin # explicit triple (CI cross-compile)
set -euo pipefail

cd "$(dirname "$0")/.."

# Target triple: first arg, else the host's (from rustc).
TRIPLE="${1:-$(rustc -vV | sed -n 's/^host: //p')}"
OUT="src-tauri/binaries/sfb-$TRIPLE"

# Chicken-and-egg: tauri-build's `build.rs` validates that the externalBin sidecar EXISTS whenever
# the package compiles — including this very `cargo build --bin sfb`. Stage an empty placeholder
# first so that existence check passes, then overwrite it with the real binary we just built.
mkdir -p src-tauri/binaries
[ -e "$OUT" ] || : > "$OUT"

echo "Building sfb sidecar for $TRIPLE"
cargo build --release --bin sfb --target "$TRIPLE" --manifest-path src-tauri/Cargo.toml

cp "src-tauri/target/$TRIPLE/release/sfb" "$OUT"
chmod +x "$OUT"
echo "Staged $OUT"
