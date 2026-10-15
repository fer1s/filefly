export const IMAGE_DECODE_TIMEOUT_MS = 5000;
export const IMAGE_PREPARATION_TIMEOUT_MS = 15000;

// Formats WebKit cannot decode on its own. Skipping the direct attempt saves the decode timeout
// (up to IMAGE_DECODE_TIMEOUT_MS) before the native Quick Look fallback kicks in.
export const NATIVE_ONLY_EXTENSIONS: ReadonlySet<string> = new Set([
  "avif",
  "heic",
  "heif",
]);
