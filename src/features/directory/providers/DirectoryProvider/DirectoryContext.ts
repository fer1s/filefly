import { createContext, useContext } from "react";

import type { DirectoryContextValue } from "./types";

export const DirectoryContext = createContext<DirectoryContextValue | null>(
  null,
);

// Typed access to the directory state. Throws if used outside the provider.
export const useDirectory = (): DirectoryContextValue => {
  const ctx = useContext(DirectoryContext);
  if (!ctx)
    throw new Error("useDirectory must be used within a DirectoryProvider");
  return ctx;
};
