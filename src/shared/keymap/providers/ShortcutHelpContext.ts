import { createContext, useContext } from "react";

export type ShortcutHelpContextValue = {
  // Whether the shortcut-help overlay is on (every actionable tooltip shown at once).
  active: boolean;
  toggle: () => void;
  exit: () => void;
};

export const ShortcutHelpContext = createContext<ShortcutHelpContextValue>({
  active: false,
  toggle: () => {},
  exit: () => {},
});

export const useShortcutHelp = () => useContext(ShortcutHelpContext);
