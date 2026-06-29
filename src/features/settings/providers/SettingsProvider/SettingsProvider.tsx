import { useCallback, useState, type ReactNode } from "react";

import { SettingsContextProvider } from "./SettingsContext";
import { useSettingsShortcut } from "../../hooks/useSettingsShortcut";
import SettingsDialog from "../../components/SettingsDialog";

// Owns the settings dialog's open state, exposes open/close to the app, and wires the
// VS Code-style shortcut. Renders the dialog itself so it's self-contained.
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  useSettingsShortcut(open);

  return (
    <SettingsContextProvider value={{ open, close }}>
      {children}
      <SettingsDialog visible={visible} onClose={close} />
    </SettingsContextProvider>
  );
};
