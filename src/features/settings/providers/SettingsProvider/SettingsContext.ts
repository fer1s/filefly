import { createContext, useContext } from "react";

import { DEFAULT_SETTINGS } from "@/shared/constants";

import type { SettingsContextValue } from "./types";
import { SettingsManager } from "../../managers/SettingsManager";

// Default no-ops / seed values so consuming outside the provider is a harmless no-op rather than a
// crash. The real settings + writer are injected by SettingsProvider.
const SettingsContext = createContext<SettingsContextValue>({
  open: () => {},
  close: () => {},
  settings: DEFAULT_SETTINGS,
  update: () => {},
  defaults: DEFAULT_SETTINGS,
  manager: new SettingsManager(),
});

export const SettingsContextProvider = SettingsContext.Provider;

export const useSettings = () => useContext(SettingsContext);
