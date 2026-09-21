// GitHub repository the app is released from; the update check reads its public releases API.
export const UPDATES_REPO = "sito8943/sito-file-browser";
// Listed (not /releases/latest): that endpoint ignores pre-releases, and every build so far is
// published as one. Newest first; drafts are skipped client-side.
export const RELEASES_API = `https://api.github.com/repos/${UPDATES_REPO}/releases?per_page=10`;
export const RELEASES_URL = `https://github.com/${UPDATES_REPO}/releases`;
// How end users upgrade (the .dmg is published through a Homebrew cask, see
// .github/workflows/update-homebrew-cask.yml).
export const BREW_UPGRADE_COMMAND = "brew upgrade --cask sito-file-browser";
// Delay before the launch check so it never competes with the first listing / window reveal.
export const UPDATE_CHECK_STARTUP_DELAY_MS = 5000;
// Network wait cap: a slow/offline GitHub must not hold a pending check forever.
export const UPDATE_CHECK_TIMEOUT_MS = 10000;

// TEMP TEST HOOK — pretend the installed version is ancient so any real release reads as an update
// (toast on launch + "available" row in Settings). Set back to false / remove before shipping.
export const FORCE_UPDATE_TEST = false;
export const FORCE_UPDATE_TEST_VERSION = "0.0.1";

export const UPDATE_STATUS = {
  IDLE: "idle",
  CHECKING: "checking",
  UP_TO_DATE: "up_to_date",
  AVAILABLE: "available",
  ERROR: "error",
} as const;

export type UpdateStatus = (typeof UPDATE_STATUS)[keyof typeof UPDATE_STATUS];
