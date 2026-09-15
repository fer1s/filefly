// How a connection authenticates. Drives which secret/key fields the form shows. Stored implicitly
// (the backend tries agent → key → password regardless); this only shapes the create form's inputs.
export const AUTH_KIND = {
  AGENT: "agent",
  KEY: "key",
  PASSWORD: "password",
} as const;

export type AuthKind = (typeof AUTH_KIND)[keyof typeof AUTH_KIND];

// Default SSH port, prefilled in the connection form.
export const SSH_DEFAULT_PORT = 22;

// Marker returned when macOS never finishes mounting an SMB share after launching its native
// credential prompt. The provider maps it to the edit/reconnect flow instead of a generic error.
export const SMB_MOUNT_TIMEOUT = "SMB_MOUNT_TIMEOUT";

// Polling window for macOS to finish mounting an SMB share after the native prompt opens.
export const SMB_POLL_INTERVAL_MS = 750;
export const SMB_POLL_ATTEMPTS = 40;

// Separators used by the persisted `smb://host/share#label` location format.
export const SMB_PATH_SEPARATOR = "/";
export const SMB_LABEL_SEPARATOR = "#";

// Result exposed by the connections provider after the complete SMB open flow finishes.
export const SMB_OPEN_RESULT = {
  OPENED: "opened",
  NEEDS_EDIT: "needs-edit",
  FAILED: "failed",
} as const;

export const CONNECTIONS_PROVIDER_ERROR =
  "useConnections must be used inside ConnectionsProvider";
