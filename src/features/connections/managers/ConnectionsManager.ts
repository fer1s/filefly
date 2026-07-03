import * as api from "@/shared/services/api";
import type { Connection, NewConnection } from "@/shared/services/api";
import { SFTP_SCHEME } from "@/shared/constants";

// Domain operations for SSH/SFTP connections. Keeps Tauri IPC out of components (see
// ARCHITECTURE_RULES §4). Phase 2 adds create; edit/remove come in later phases.
export class ConnectionsManager {
  // The saved connections (from connections.toml). Secrets are stripped by the backend.
  list(): Promise<Connection[]> {
    return api.sftpListConnections();
  }

  // Create (or replace by id) a connection. Secrets go to the OS keychain (backend), not the toml.
  add(connection: NewConnection): Promise<void> {
    return api.sftpAddConnection(connection);
  }

  // The virtual path that navigates to a connection's root: `sftp://<id>/`. The filesystem layer
  // routes this to the remote backend.
  rootPath(id: string): string {
    return `${SFTP_SCHEME}${id}/`;
  }

  // The connection's home directory as a `sftp://<id>/home` URL — where `ssh` lands. Connects to
  // resolve it, so opening a connection shows the login dir instead of the filesystem root.
  home(id: string): Promise<string> {
    return api.sftpHome(id);
  }

  // The path prefix identifying a connection, for highlighting its sidebar row whatever remote
  // folder is open under it.
  prefix(id: string): string {
    return `${SFTP_SCHEME}${id}`;
  }

  // Derive a stable, readable id from a display name — it becomes the sftp://<id>/ path segment.
  // Lowercased, non-alphanumerics collapsed to single hyphens, trimmed. Falls back to "connection"
  // for an all-symbol name. Same name → same id → creating it again replaces the old one.
  idFor(name: string): string {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "connection";
  }
}
