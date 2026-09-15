// The bundled changelog (Vite inlines the file at build time, so the notes ship offline with the
// app and always match the running version).
import changelogSource from "../../../CHANGELOG.md?raw";

export { changelogSource };

export const CHANGELOG_TITLE_ID = "changelog-title";

// Release headings look like "## [0.9.0]" (Keep a Changelog style).
export const CHANGELOG_HEADING = /^## \[([^\]]+)\]\s*$/;

// TEMP TEST HOOK — pretend the previous run was an ancient version so the launch reads as an update
// (toast → changelog dialog). Set back to false / remove before shipping.
export const FORCE_WHATS_NEW_TEST = false;
export const FORCE_WHATS_NEW_PREVIOUS_VERSION = "0.0.1";
