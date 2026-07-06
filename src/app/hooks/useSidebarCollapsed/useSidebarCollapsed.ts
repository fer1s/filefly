import { useCallback, useEffect, useState } from "react";

import { SIDEBAR_COLLAPSED_STORAGE_KEY } from "./constants";

// Sidebar collapsed/expanded preference, persisted across sessions.
export const useSidebarCollapsed = () => {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === String(true),
  );

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return { collapsed, toggle };
};
