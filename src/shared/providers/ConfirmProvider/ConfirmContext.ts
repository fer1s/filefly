import { createContext, useContext } from "react";

import type { ConfirmContextValue } from "./types";

// Default cancels immediately if no provider is mounted (defensive; the app always mounts one).
const fallback: ConfirmContextValue = { confirm: async () => false };

export const ConfirmContext = createContext<ConfirmContextValue>(fallback);

export const useConfirm = () => useContext(ConfirmContext);
