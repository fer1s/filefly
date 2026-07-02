import { useCallback } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import { useStateContext } from "@/shared/providers/StateProvider";
import { TabBar, useTabsShortcuts } from "@/features/tabs";
import PathBar from "@/features/navigation";
import QuickBar from "@/features/quickbar";

import Volumes from "@/features/volumes";
import Directory, { DirectoryProvider, InfoPanel } from "@/features/directory";

import { ROUTES } from "./routes";

function AppContent() {
  const location = useLocation();
  const { tabs, activeTabId, newTab, closeTab, selectTab } = useStateContext();

  const onDirectory = location.pathname === ROUTES.directory;

  // Tab keyboard shortcuts live here (always mounted) so Cmd+T works even with the strip hidden.
  const closeActiveTab = useCallback(
    () => closeTab(activeTabId),
    [closeTab, activeTabId],
  );
  const cycleTab = useCallback(
    (direction: number) => {
      const index = tabs.findIndex((tab) => tab.id === activeTabId);
      const next = (index + direction + tabs.length) % tabs.length;
      selectTab(tabs[next].id);
    },
    [tabs, activeTabId, selectTab],
  );
  // Cmd+1..9 → the tab at that 1-based position (no-op if there's no tab there).
  const selectTabBySlot = useCallback(
    (slot: number) => {
      if (tabs[slot]) selectTab(tabs[slot].id);
    },
    [tabs, selectTab],
  );
  useTabsShortcuts({ newTab, closeActiveTab, cycleTab, selectTabBySlot });

  return (
    // The directory state (selection, clipboard, preview…) is shared by the directory view,
    // the QuickBar's quick actions and the info panel, so the provider wraps them all.
    <DirectoryProvider>
      <div className="AppContent">
        <TabBar />
        <PathBar />
        {/* Zoom only applies to the directory view, so the quick bar is hidden on Volumes. */}
        {onDirectory && <QuickBar />}
        <div className="Page">
          <div className="page_main">
            <Routes>
              <Route path={ROUTES.volumes} element={<Volumes />} />
              <Route path={ROUTES.directory} element={<Directory />} />
            </Routes>
          </div>
          {onDirectory && <InfoPanel />}
        </div>
      </div>
    </DirectoryProvider>
  );
}

export default AppContent;
