import * as api from "@/shared/services/api";
import { SMB_SCHEME } from "@/shared/constants";

import {
  SMB_MOUNT_TIMEOUT,
  SMB_LABEL_SEPARATOR,
  SMB_PATH_SEPARATOR,
  SMB_POLL_ATTEMPTS,
  SMB_POLL_INTERVAL_MS,
} from "../constants";
import type { SmbLocation } from "../models";
import { delay } from "../utils";

// Domain operations for saved SMB (Windows share) locations. Unlike SSH connections there's no
// virtual backend: macOS owns the mount, so opening a location resolves (mounting if needed) to a
// real /Volumes path the local filesystem cores then browse. Keeps Tauri IPC out of components.
export class SmbManager {
  // Build the stored path for a location. The optional display name rides along as a `#name`
  // fragment so a single string carries both (sidebar custom items persist only a path). Host and
  // share are stored raw — this is our own scheme, parsed here, never fetched as a real URL.
  path(host: string, share: string, name?: string): string {
    const base = `${SMB_SCHEME}${host.trim()}${SMB_PATH_SEPARATOR}${share.trim()}`;
    const label = name?.trim();
    return label && label !== share.trim()
      ? `${base}${SMB_LABEL_SEPARATOR}${label}`
      : base;
  }

  // Parse a stored `smb://host/share[#name]` path, or null if it isn't one. Ignores any deeper path
  // segments (a location is always the share root).
  parse(path: string): SmbLocation | null {
    if (!path.startsWith(SMB_SCHEME)) return null;
    const rest = path.slice(SMB_SCHEME.length);
    const hash = rest.indexOf(SMB_LABEL_SEPARATOR);
    const name = hash === -1 ? "" : rest.slice(hash + 1).trim();
    const body = hash === -1 ? rest : rest.slice(0, hash);
    const slash = body.indexOf(SMB_PATH_SEPARATOR);
    if (slash === -1) return null;
    const host = body.slice(0, slash).trim();
    const share = body
      .slice(slash + 1)
      .split(SMB_PATH_SEPARATOR)[0]
      .trim();
    if (!host || !share) return null;
    return { host, share, name: name || share, path };
  }

  // The /Volumes path the location is currently mounted at, or null when it isn't mounted.
  resolve(host: string, share: string): Promise<string | null> {
    return api.smbMountPoint(host, share);
  }

  diagnose(host: string, share?: string): Promise<api.SmbDiagnostic> {
    return api.smbDiagnose(host, share);
  }

  shares(host: string): Promise<api.SmbShare[]> {
    return api.smbShares(host);
  }

  mounts(): Promise<api.SmbMount[]> {
    return api.smbMounts();
  }

  // Ask macOS to connect (its native credential prompt) and poll the mount table until the share
  // appears. The provider resolves existing mounts before calling this method.
  async mount(
    host: string,
    share: string,
    onPoll?: (attempt: number, total: number) => void,
  ): Promise<string> {
    await api.smbConnect(host, share);
    for (let attempt = 1; attempt <= SMB_POLL_ATTEMPTS; attempt += 1) {
      onPoll?.(attempt, SMB_POLL_ATTEMPTS);
      await delay(SMB_POLL_INTERVAL_MS);
      const mounted = await api.smbMountPoint(host, share);
      if (mounted) return mounted;
    }
    throw new Error(SMB_MOUNT_TIMEOUT);
  }
}
