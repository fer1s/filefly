import { cpSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";

if (process.platform !== "darwin") process.exit(0);

const architectures = {
  "aarch64-apple-darwin": "arm64",
  "x86_64-apple-darwin": "x86_64",
};
const target = process.env.TAURI_ENV_TARGET_TRIPLE;
const architecture = architectures[target];

if (!architecture) {
  console.error(`Unsupported Finder Sync target: ${target ?? "unset"}`);
  process.exit(1);
}

const project = "src-tauri/macos/FinderSync.xcodeproj";
const derivedData = "src-tauri/target/finder-sync/derived";
const builtExtension = resolve(
  derivedData,
  "Build/Products/Release/FinderSync.appex",
);
const extensionOutput = "src-tauri/target/finder-sync/FinderSync.appex";

const result = spawnSync(
  "xcodebuild",
  [
    "-project",
    project,
    "-scheme",
    "FinderSyncExtension",
    "-configuration",
    "Release",
    "-sdk",
    "macosx",
    "-derivedDataPath",
    derivedData,
    "-arch",
    architecture,
    "CODE_SIGN_IDENTITY=-",
    "CODE_SIGNING_REQUIRED=NO",
  ],
  { stdio: "inherit" },
);

if (result.error) {
  console.error(`Could not start xcodebuild: ${result.error.message}`);
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

mkdirSync(dirname(extensionOutput), { recursive: true });
rmSync(extensionOutput, { recursive: true, force: true });
cpSync(builtExtension, extensionOutput, { recursive: true });
