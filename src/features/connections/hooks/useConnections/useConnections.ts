import { useCallback, useEffect, useMemo, useState } from "react";

import type { Connection } from "@/shared/services/api";

import { ConnectionsManager } from "../../managers/ConnectionsManager";

// Load the saved SSH/SFTP connections and expose the manager for path building. Read-only for
// phase 1 (see SSH_PLAN.md); `reload` lets callers refresh after phase-2 CRUD lands.
export const useConnections = () => {
  const manager = useMemo(() => new ConnectionsManager(), []);
  const [connections, setConnections] = useState<Connection[]>([]);

  const reload = useCallback(() => {
    void manager
      .list()
      .then(setConnections)
      .catch(() => setConnections([]));
  }, [manager]);

  useEffect(reload, [reload]);

  return { connections, manager, reload };
};
