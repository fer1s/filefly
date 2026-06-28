import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { StateProvider } from "@/shared/providers/StateProvider";
import { KeymapProvider } from "@/shared/keymap";

import SideBar from "@/features/sidebar";
import { SettingsProvider } from "@/features/settings";
import { useTabs } from "@/features/tabs";
import ToastStack from "@/shared/components/patterns/ToastStack";

import AppContent from "./AppContent";
import { useToasts } from "./hooks/useToasts";
import { useZoom } from "./hooks/useZoom";
import { useDirectoryContents } from "./hooks/useDirectoryContents";
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";
import { VIEW_MODE, type ViewMode } from "@/shared/constants";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Single domain manager instance for the whole app, provided through context.
  const fs = useMemo(() => new FileSystemManager(), []);

  // Each concern owns its own state and side effects; the composition root just wires them
  // together into the shared context (see ARCHITECTURE_RULES §6, §4).
  const tabs = useTabs();
  const directory = useDirectoryContents({
    fs,
    path: tabs.path,
    navigate,
    locationPathname: location.pathname,
  });
  const zoom = useZoom(fs, tabs.path);
  const { toasts, dismissToast } = useToasts();
  const sidebar = useSidebarCollapsed();

  const [view, setView] = useState<ViewMode>(VIEW_MODE.GRID);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const toggleShowHidden = useCallback(() => {
    const next = !showHidden;
    setShowHidden(next);
    notify(
      next ? t.directory.showingHidden : t.directory.hidingHidden,
      TOAST_TYPE.INFO,
    );
  }, [showHidden]);

  // The OS/webview context menu is replaced by the app's own; suppress it everywhere.
  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => event.preventDefault();
    document.addEventListener("contextmenu", preventContextMenu);
    return () =>
      document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

  return (
    <StateProvider
      value={{
        fs,
        volumes: directory.volumes,
        setVolumes: directory.setVolumes,
        tabs: tabs.tabs,
        activeTabId: tabs.activeTabId,
        newTab: tabs.newTab,
        closeTab: tabs.closeTab,
        selectTab: tabs.selectTab,
        path: tabs.path,
        setPath: tabs.setPath,
        canGoBack: tabs.canGoBack,
        canGoForward: tabs.canGoForward,
        goBack: tabs.goBack,
        goForward: tabs.goForward,
        dirContent: directory.dirContent,
        setDirContent: directory.setDirContent,
        accessDenied: directory.accessDenied,
        view,
        setView,
        showHidden,
        toggleShowHidden,
        zoom: zoom.zoom,
        zoomIn: zoom.zoomIn,
        zoomOut: zoom.zoomOut,
        setZoomTo: zoom.setZoomTo,
        defaultZoom: zoom.defaultZoom,
        setDefaultZoom: zoom.setDefaultZoom,
        search: tabs.search,
        setSearch: tabs.setSearch,
        refreshDir: directory.refreshDir,
        infoPanelOpen: tabs.infoPanelOpen,
        toggleInfoPanel: tabs.toggleInfoPanel,
      }}
    >
      <KeymapProvider>
        <SettingsProvider>
          <div className={classNames("App", sidebar.collapsed && "collapsed")}>
            <SideBar
              collapsed={sidebar.collapsed}
              onToggle={sidebar.toggle}
              visitedPaths={tabs.activeTab.history.stack}
            />
            <AppContent />
          </div>
        </SettingsProvider>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </KeymapProvider>
    </StateProvider>
  );
};

export default App;
