import { useCallback, useState } from "react";

import { DEFAULT_SETTINGS } from "@/shared/constants";

import { SettingsContextProvider } from "./SettingsContext";
import type { SettingsProviderProps } from "./types";
import { useSettingsShortcut } from "../../hooks/useSettingsShortcut";
import SettingsDialog from "../../components/SettingsDialog";

// Owns the settings dialog's open state, exposes open/close + the settings binding to the app, and
// wires the VS Code-style shortcut. Renders the dialog itself so it's self-contained.
export const SettingsProvider = ({
  children,
  settings,
  update,
}: SettingsProviderProps) => {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  useSettingsShortcut(open);

  return (
    <SettingsContextProvider
      value={{ open, close, settings, update, defaults: DEFAULT_SETTINGS }}
    >
      {children}
      <SettingsDialog visible={visible} onClose={close} />
    </SettingsContextProvider>
  );
};
