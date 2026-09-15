import { useCallback, useEffect, useMemo, useState } from "react";

import type { Connection } from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import { SMB_MOUNT_TIMEOUT, SMB_OPEN_RESULT } from "../../constants";
import { ConnectionsManager } from "../../managers/ConnectionsManager";
import { SmbManager } from "../../managers/SmbManager";
import type { SmbLocation, SmbOpenResult } from "../../models";
import { ConnectionsContext } from "./ConnectionsContext";
import type { ConnectionsProviderProps } from "./types";

export const ConnectionsProvider = ({ children }: ConnectionsProviderProps) => {
  const manager = useMemo(() => new ConnectionsManager(), []);
  const smbManager = useMemo(() => new SmbManager(), []);
  const [connections, setConnections] = useState<Connection[]>([]);

  const reload = useCallback(() => {
    void manager
      .list()
      .then(setConnections)
      .catch(() => setConnections([]));
  }, [manager]);

  useEffect(reload, [reload]);

  const openSmbLocation = useCallback(
    async (
      location: SmbLocation,
      navigate: (path: string) => void,
    ): Promise<SmbOpenResult> => {
      const { host, share, name } = location;
      const log = (message: string, ...details: unknown[]) =>
        console.info(`[smb] ${message}`, ...details);

      try {
        log(`open ${location.path}`);
        const mounted = await smbManager.resolve(host, share);
        if (mounted) {
          log(`already mounted at ${mounted}`);
          navigate(mounted);
          return SMB_OPEN_RESULT.OPENED;
        }

        notify(t.smb.checking(name), TOAST_TYPE.INFO);
        const diagnostic = await smbManager.diagnose(host, share);
        log(
          `diagnose ${host}:${diagnostic.port} reachable=${diagnostic.reachable} resolved=${diagnostic.resolved}`,
          diagnostic,
        );
        if (!diagnostic.reachable) {
          notify(t.smb.unreachableToast(name, host), TOAST_TYPE.ERROR);
          return SMB_OPEN_RESULT.NEEDS_EDIT;
        }

        notify(t.smb.connecting(name), TOAST_TYPE.INFO);
        log(`connecting — asking macOS to mount //${host}/${share}`);
        const mountPath = await smbManager.mount(
          host,
          share,
          (attempt, total) => log(`waiting for mount… (${attempt}/${total})`),
        );
        log(`mounted at ${mountPath}`);
        navigate(mountPath);
        notify(t.smb.mounted(name), TOAST_TYPE.SUCCESS);
        return SMB_OPEN_RESULT.OPENED;
      } catch (error) {
        const message = String(error);
        log(`failed: ${message}`);
        if (message.includes(SMB_MOUNT_TIMEOUT)) {
          notify(t.smb.connectTimeout, TOAST_TYPE.ERROR);
          return SMB_OPEN_RESULT.NEEDS_EDIT;
        }
        notify(t.smb.connectError(message), TOAST_TYPE.ERROR);
        return SMB_OPEN_RESULT.FAILED;
      }
    },
    [smbManager],
  );

  const value = useMemo(
    () => ({
      connections,
      manager,
      smbManager,
      reload,
      openSmbLocation,
    }),
    [connections, manager, smbManager, reload, openSmbLocation],
  );

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};
