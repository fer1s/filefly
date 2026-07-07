import { createContext, useContext } from "react";

import type { CompressContextValue } from "./types";

// No-op default if no provider is mounted (defensive; the app always mounts one).
const fallback: CompressContextValue = {
  requestOptions: async () => null,
  requestPassword: async () => null,
};

export const CompressContext = createContext<CompressContextValue>(fallback);

export const useCompress = () => useContext(CompressContext);
