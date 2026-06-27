import { createContext, useContext } from "react";

import type { KeymapContextValue } from "../types";

export const KeymapContext = createContext<KeymapContextValue>({
  keymap: {},
  setBinding: () => {},
});

export const useKeymap = () => useContext(KeymapContext);
