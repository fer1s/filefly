import type { ReactNode } from "react";

import type { Connection } from "@/shared/services/api";

import type { ConnectionsManager } from "../../managers/ConnectionsManager";
import type { SmbManager } from "../../managers/SmbManager";
import type { SmbLocation, SmbOpenResult } from "../../models";

export type ConnectionsProviderProps = {
  children: ReactNode;
};

export type ConnectionsContextValue = {
  connections: Connection[];
  manager: ConnectionsManager;
  smbManager: SmbManager;
  reload: () => void;
  openSmbLocation: (
    location: SmbLocation,
    navigate: (path: string) => void,
  ) => Promise<SmbOpenResult>;
};
