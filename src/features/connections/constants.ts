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
