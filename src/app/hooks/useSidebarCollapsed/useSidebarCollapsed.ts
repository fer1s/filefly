import { useCallback, useEffect, useState } from "react";

// localStorage key for the sidebar's collapsed state.
const SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebarCollapsed";

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
