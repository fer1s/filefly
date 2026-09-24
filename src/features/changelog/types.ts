export type ChangelogEntry = {
  // Semver without brackets, e.g. "0.9.0".
  version: string;
  // Markdown body of the release (everything under its heading, until the next one).
  body: string;
};
