import { createContext, useContext } from "react";

import type { HotkeyContextValue } from "../types";

export const HotkeyContext = createContext<HotkeyContextValue>({
  register: () => () => {},
  pushScope: () => () => {},
});

export const useHotkeyContext = () => useContext(HotkeyContext);
