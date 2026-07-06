import { createContext, useContext } from "react";

import type { ModalContextValue } from "./types";

// Defaults so consuming outside the provider is a harmless no-op (anyOpen stays false).
const ModalContext = createContext<ModalContextValue>({
  anyOpen: false,
  open: () => {},
  close: () => {},
});

export const ModalContextProvider = ModalContext.Provider;

export const useModal = () => useContext(ModalContext);
