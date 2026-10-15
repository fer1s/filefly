import { createContext, useContext } from "react";

import type { ChangelogContextValue } from "./types";

export const ChangelogContext = createContext<ChangelogContextValue | null>(
  null,
);

export const useChangelog = () => {
  const value = useContext(ChangelogContext);
  if (!value)
    throw new Error("useChangelog must be used within ChangelogProvider");
  return value;
};
