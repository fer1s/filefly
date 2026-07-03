import * as api from "@/shared/services/api";
import type { Connection } from "@/shared/services/api";
import { SFTP_SCHEME } from "@/shared/constants";

// Domain operations for SSH/SFTP connections. Keeps Tauri IPC out of components (see
// ARCHITECTURE_RULES §4). Phase 1 is read-only (list); phase 2 adds add/edit/remove/connect.
export class ConnectionsManager {
  // The saved connections (from connections.toml). Secrets are stripped by the backend.
  list(): Promise<Connection[]> {
    return api.sftpListConnections();
  }

  // The virtual path that navigates to a connection's root: `sftp://<id>/`. The filesystem layer
  // routes this to the remote backend.
  rootPath(id: string): string {
    return `${SFTP_SCHEME}${id}/`;
  }
}
