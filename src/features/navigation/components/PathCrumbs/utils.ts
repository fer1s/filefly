import { SFTP_SCHEME } from "@/shared/constants";

import type { Crumb } from "./types";

// Append one crumb per POSIX segment while preserving the caller-provided root/prefix.
const appendSegments = (
  crumbs: Crumb[],
  path: string,
  initialPath: string,
): Crumb[] => {
  const segments = path.replace(/\/+$/, "").split("/").filter(Boolean);
  let accumulated = initialPath;
  for (const segment of segments) {
    accumulated += `/${segment}`;
    crumbs.push({ label: segment, path: accumulated });
  }

  return crumbs;
};

// Split a local POSIX path or an SFTP URL into navigable breadcrumbs. Remote crumbs retain the
// `sftp://<connection>` prefix at every level; treating that URL as POSIX would produce broken
// local paths such as `/sftp:` and `/sftp:/connection` when an ancestor is clicked.
export const buildCrumbs = (path: string): Crumb[] => {
  if (!path.startsWith(SFTP_SCHEME)) {
    return appendSegments([{ label: "/", path: "/" }], path, "");
  }

  const remote = path.slice(SFTP_SCHEME.length);
  const separatorIndex = remote.indexOf("/");
  const connectionId =
    separatorIndex === -1 ? remote : remote.slice(0, separatorIndex);
  const remotePath =
    separatorIndex === -1 ? "/" : remote.slice(separatorIndex) || "/";
  const remoteRoot = `${SFTP_SCHEME}${connectionId}`;

  return appendSegments(
    [{ label: "/", path: `${remoteRoot}/` }],
    remotePath,
    remoteRoot,
  );
};
