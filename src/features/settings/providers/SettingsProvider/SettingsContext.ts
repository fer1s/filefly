import { createContext, useContext } from "react";

import type { SettingsContextValue } from "./types";

// Default no-ops so consuming outside the provider is a harmless no-op rather than a crash.
const SettingsContext = createContext<SettingsContextValue>({
  open: () => {},
  close: () => {},
});

export const SettingsContextProvider = SettingsContext.Provider;

export const useSettings = () => useContext(SettingsContext);
