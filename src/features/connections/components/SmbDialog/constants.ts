// aria-labelledby target linking the dialog to its title (accessibility).
export const SMB_TITLE_ID = "smb-dialog-title";

// Probe outcome for the inline "Test connection" line (idle = not run yet).
export const SMB_PROBE_STATE = {
  IDLE: "idle",
  TESTING: "testing",
  REACHABLE: "reachable",
  UNREACHABLE: "unreachable",
} as const;

// State of the share-discovery list (smbutil view, Keychain-backed).
export const SMB_SHARES_STATE = {
  IDLE: "idle",
  LOADING: "loading",
  LOADED: "loaded",
  ERROR: "error",
} as const;

// A share is one segment, so both POSIX and Windows path separators are rejected.
export const SMB_SHARE_SEPARATOR_PATTERN = /[/\\]/;
