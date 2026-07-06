import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ModalContextProvider } from "./ModalContext";

// Tracks how many modal dialogs are open so the rest of the app (e.g. the directory's keyboard
// navigation) can stand down while one is up. The shared Dialog registers itself here; this owns
// only the ref count and derives `anyOpen` from it.
export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [openCount, setOpenCount] = useState(0);

  const open = useCallback(() => setOpenCount((count) => count + 1), []);
  const close = useCallback(
    () => setOpenCount((count) => Math.max(0, count - 1)),
    [],
  );

  const value = useMemo(
    () => ({ anyOpen: openCount > 0, open, close }),
    [openCount, open, close],
  );

  return <ModalContextProvider value={value}>{children}</ModalContextProvider>;
};
