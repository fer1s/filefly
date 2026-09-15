import { createContext, useContext } from "react";

import { CONNECTIONS_PROVIDER_ERROR } from "../../constants";
import type { ConnectionsContextValue } from "./types";

export const ConnectionsContext = createContext<ConnectionsContextValue | null>(
  null,
);

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (!context) throw new Error(CONNECTIONS_PROVIDER_ERROR);
  return context;
};
