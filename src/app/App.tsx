import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useNavigate,
  useLocation,
  NavigateFunction,
  Location,
} from "react-router-dom";

import { StateProvider } from "@/shared/providers/StateProvider";
import { KeymapProvider } from "@/shared/keymap";

import SideBar from "@/features/sidebar";
import ToastStack, {
  TOAST_VISIBLE_MS,
  TOAST_EXIT_MS,
  type ToastData,
} from "@/shared/components/patterns/ToastStack";

import AppContent from "./AppContent";

import { setNotifier, notify, TOAST_TYPE, ToastType } from "@/shared/toast";
import { ROUTES } from "./routes";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { Volume, DirEntry, Tab } from "@/shared/models";
import {
  makeTab,
  tabPath,
  navigateTab,
  backTab,
  forwardTab,
  canGoBack,
  canGoForward,
  loadTabs,
  loadActiveTabId,
  saveTabs,
} from "@/features/tabs";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";
import {
  ACCESS_DENIED_ERROR,
  VIEW_MODE,
  ZOOM_DEFAULT,
  ZOOM_MAX,
  ZOOM_MIN,
  ZOOM_STEP,
  type ViewMode,
} from "@/shared/constants";

// Coalesce bursts of filesystem events (a single move fires several) into one refresh.
const DIRECTORY_WATCH_DEBOUNCE_MS = 150;

const App = () => {
  const navigate: NavigateFunction = useNavigate();
  const location: Location = useLocation();

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [tabs, setTabs] = useState<Tab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    loadActiveTabId(tabs),
  );
  const [dirContent, setDirContent] = useState<DirEntry[]>([]);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [view, setView] = useState<ViewMode>(VIEW_MODE.GRID);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(ZOOM_DEFAULT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastId = useRef(0);

  // The active tab drives the current location, history and search. Fall back to the first tab
  // if the active id ever goes stale.
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const path = tabPath(activeTab);
  const search = activeTab.search;
  const infoPanelOpen = activeTab.infoPanelOpen;

  // Apply a transform to the active tab only.
  const updateActiveTab = useCallback(
    (transform: (tab: Tab) => Tab) =>
      setTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? transform(tab) : tab)),
      ),
    [activeTabId],
  );

  const setPath = useCallback(
    (nextPath: string) => updateActiveTab((tab) => navigateTab(tab, nextPath)),
    [updateActiveTab],
  );

  const goBack = useCallback(
    () => updateActiveTab(backTab),
    [updateActiveTab],
  );

  const goForward = useCallback(
    () => updateActiveTab(forwardTab),
    [updateActiveTab],
  );

  const setSearch = useCallback(
    (nextSearch: string) =>
      updateActiveTab((tab) => ({ ...tab, search: nextSearch })),
    [updateActiveTab],
  );

  const toggleInfoPanel = useCallback(
    () =>
      updateActiveTab((tab) => ({ ...tab, infoPanelOpen: !tab.infoPanelOpen })),
    [updateActiveTab],
  );

  // Open a new tab cloning the current location (and panel state) and focus it.
  const newTab = useCallback(() => {
    const tab = makeTab(path, infoPanelOpen);
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [path, infoPanelOpen]);

  // Close a tab; always keep at least one open. When closing the active tab, activate the
  // neighbour that slides into its place.
  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1) return;
      const index = tabs.findIndex((tab) => tab.id === id);
      const remaining = tabs.filter((tab) => tab.id !== id);
      setTabs(remaining);
      if (id === activeTabId)
        setActiveTabId(remaining[Math.min(index, remaining.length - 1)].id);
    },
    [tabs, activeTabId],
  );

  const selectTab = useCallback((id: string) => setActiveTabId(id), []);

  // Persist the tab session whenever it changes.
  useEffect(() => {
    saveTabs(tabs, activeTabId);
  }, [tabs, activeTabId]);

  // Persist the collapsed state across sessions.
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Dismiss a toast: first flag it as leaving so it animates out, then drop it once the exit
  // animation has finished.
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === id ? { ...toast, leaving: true } : toast,
      ),
    );
    setTimeout(
      () => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
      TOAST_EXIT_MS,
    );
  }, []);

  // Register the global notifier so any module can push a toast; auto-dismiss after a few seconds.
  useEffect(() => {
    const addToast = (message: string, type: ToastType) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => dismissToast(id), TOAST_VISIBLE_MS);
    };

    setNotifier(addToast);
    return () => setNotifier(null);
  }, [dismissToast]);

  // Single domain manager instance for the whole app, provided through context.
  const fs = useMemo(() => new FileSystemManager(), []);

  const fetchVolumes = useCallback(
    async () => setVolumes(await fs.listVolumes()),
    [fs],
  );

  // Read a directory, reporting whether the OS blocked it (Full Disk Access required, e.g. the
  // Trash). Kept free of setState so callers own state updates in their async callbacks.
  const loadDirectory = useCallback(
    async (target: string): Promise<{ files: DirEntry[]; denied: boolean }> => {
      try {
        return { files: await fs.readDirectory(target), denied: false };
      } catch (err) {
        return { files: [], denied: String(err).includes(ACCESS_DENIED_ERROR) };
      }
    },
    [fs],
  );

  // Reload the current view (used after filesystem operations like copy/move/rename/delete).
  const refreshDir = useCallback(() => {
    if (path === "") return fetchVolumes();
    loadDirectory(path).then(({ files, denied }) => {
      setDirContent(files);
      setAccessDenied(denied);
    });
  }, [loadDirectory, fetchVolumes, path]);

  const toggleShowHidden = useCallback(() => {
    const next = !showHidden;
    setShowHidden(next);
    notify(
      next ? t.directory.showingHidden : t.directory.hidingHidden,
      TOAST_TYPE.INFO,
    );
  }, [showHidden]);

  // Load the folder's saved zoom on navigation (defaults to 100% when none is saved).
  useEffect(() => {
    if (path === "") return;
    let cancelled = false;
    fs.getFolderZoom(path).then((saved) => {
      if (!cancelled) setZoom(saved ?? ZOOM_DEFAULT);
    });
    return () => {
      cancelled = true;
    };
  }, [fs, path]);

  // Clamp to the allowed range and round to whole percents.
  const clampZoom = (value: number) =>
    Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));

  // Persist the folder's zoom when it actually changed. Persisting only on explicit zoom
  // (not in an effect watching `zoom`) avoids a load -> save loop.
  const persistZoom = useCallback(
    (next: number, current: number) => {
      if (next !== current)
        fs.setFolderZoom(path, next).catch((err) =>
          console.error("Failed to persist zoom preference:\n" + err),
        );
    },
    [fs, path],
  );

  // Set the zoom to an absolute multiplier (used by the slider).
  const setZoomTo = useCallback(
    (value: number) => {
      if (path === "") return;
      setZoom((current) => {
        const next = clampZoom(value);
        persistZoom(next, current);
        return next;
      });
    },
    [path, persistZoom],
  );

  const stepZoom = useCallback(
    (delta: number) => {
      if (path === "") return;
      setZoom((current) => {
        const next = clampZoom(current + delta);
        persistZoom(next, current);
        return next;
      });
    },
    [path, persistZoom],
  );

  const zoomIn = useCallback(() => stepZoom(ZOOM_STEP), [stepZoom]);
  const zoomOut = useCallback(() => stepZoom(-ZOOM_STEP), [stepZoom]);

  // Keep a ref to the latest refreshDir so the watcher below doesn't re-subscribe on every
  // change to it (it changes with `path`, which already re-runs the watch effect).
  const refreshDirRef = useRef(refreshDir);
  useEffect(() => {
    refreshDirRef.current = refreshDir;
  }, [refreshDir]);

  // Watch the current directory so external changes (e.g. `mv`/`rm` from a terminal, or another
  // app) refresh the listing automatically. Debounced, and torn down when the path changes.
  useEffect(() => {
    if (path === "") return; // Volumes view — nothing to watch.

    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    let timer: number | undefined;

    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(
        () => refreshDirRef.current(),
        DIRECTORY_WATCH_DEBOUNCE_MS,
      );
    };

    fs.watchDirectory(path, onChange)
      .then((unwatch) => {
        if (cancelled) unwatch();
        else stopWatching = unwatch;
      })
      .catch((err) => {
        // Unwatchable paths (e.g. permission denied) simply won't auto-refresh.
        console.error("Failed to watch directory:\n" + err);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopWatching?.();
    };
  }, [fs, path]);

  useEffect(() => {
    let cancelled = false;

    fs.listVolumes().then((nextVolumes) => {
      if (!cancelled) setVolumes(nextVolumes);
    });

    return () => {
      cancelled = true;
    };
  }, [fs]);

  useEffect(() => {
    if (path === "") {
      navigate(ROUTES.volumes);
      return;
    }

    loadDirectory(path).then(({ files, denied }) => {
      setDirContent(files);
      setAccessDenied(denied);
      if (location.pathname !== ROUTES.directory && path !== "")
        navigate(ROUTES.directory);
    });
  }, [loadDirectory, location.pathname, navigate, path]);

  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    document.addEventListener("contextmenu", preventContextMenu);
    return () =>
      document.removeEventListener("contextmenu", preventContextMenu);
  }, []);

  return (
    <StateProvider
      value={{
        fs,
        volumes,
        setVolumes,
        tabs,
        activeTabId,
        newTab,
        closeTab,
        selectTab,
        path,
        setPath,
        canGoBack: canGoBack(activeTab),
        canGoForward: canGoForward(activeTab),
        goBack,
        goForward,
        dirContent,
        setDirContent,
        accessDenied,
        view,
        setView,
        showHidden,
        toggleShowHidden,
        zoom,
        zoomIn,
        zoomOut,
        setZoomTo,
        search,
        setSearch,
        refreshDir,
        infoPanelOpen,
        toggleInfoPanel,
      }}
    >
      <KeymapProvider>
        <div className={classNames("App", sidebarCollapsed && "collapsed")}>
          <SideBar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((c) => !c)}
            visitedPaths={activeTab.history.stack}
          />
          <AppContent />
        </div>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </KeymapProvider>
    </StateProvider>
  );
};

export default App;
