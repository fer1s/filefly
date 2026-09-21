import { CHANGELOG_HEADING } from "./constants";
import type { ChangelogEntry } from "./types";

// Split the Keep-a-Changelog markdown into per-release entries, newest first (file order). Text
// before the first release heading (title, preamble) is dropped.
export const parseChangelog = (source: string): ChangelogEntry[] => {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;
  for (const line of source.split("\n")) {
    const match = CHANGELOG_HEADING.exec(line);
    if (match) {
      current = { version: match[1], body: "" };
      entries.push(current);
    } else if (current) {
      current.body += line + "\n";
    }
  }
  return entries.map((e) => ({ ...e, body: e.body.trim() }));
};
