import type { UpdateStatus } from "./constants";

// A published release, reduced to what the UI needs.
export type ReleaseInfo = {
  // Semver without the leading "v" (e.g. "0.9.0").
  version: string;
  // Web page of the release (download links, notes).
  url: string;
};

export type UpdateState = {
  status: UpdateStatus;
  // The running app's version (from the bundle), resolved on the first check.
  current: string;
  // Set once a check succeeds.
  latest: ReleaseInfo | null;
  // When the last check finished (ms epoch), for the Settings row.
  checkedAt: number | null;
};
