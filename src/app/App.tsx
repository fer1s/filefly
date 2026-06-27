import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useNavigate,
  useLocation,
  NavigateFunction,
  Location,
} from "react-router-dom";

import { StateProvider } from "@/shared/providers/StateProvider";

import SideBar from "@/features/sidebar";
import ToastStack, {
  type ToastData,
} from "@/shared/components/patterns/ToastStack";

import AppContent from "./AppContent";

import { setNotifier, ToastType } from "@/shared/toast";
import { ROUTES } from "./routes";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { Volume, DirEntry } from "@/shared/models";
import { classNames } from "@/shared/utils";
import {
  ACCESS_DENIED_ERROR,
  VIEW_MODE,
  type ViewMode,
} from "@/shared/constants";

const App = () => {
  const navigate: NavigateFunction = useNavigate();
  const location: Location = useLocation();

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [pathHistory, setPathHistory] = useState<{
    stack: string[];
    index: number;
  }>({ stack: [""], index: 0 });
  const [dirContent, setDirContent] = useState<DirEntry[]>([]);
  const [accessDenied, setAccessDenied] = useState<boolean>(false);
  const [view, setView] = useState<ViewMode>(VIEW_MODE.GRID);
  const [search, setSearch] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(
    () => localStorage.getItem("sidebarCollapsed") === "true",
  );

  const [toasts, setToasts] = useState<ToastData[]>([]);
  const toastId = useRef(0);

  const path = pathHistory.stack[pathHistory.index];

  const setPath = useCallback((nextPath: string) => {
    setSearch("");
    setPathHistory((history) => {
      if (history.stack[history.index] === nextPath) return history;

      const stack = [...history.stack.slice(0, history.index + 1), nextPath];
      return { stack, index: stack.length - 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setSearch("");
    setPathHistory((history) =>
      history.index === 0 ? history : { ...history, index: history.index - 1 },
    );
  }, []);

  const goForward = useCallback(() => {
    setSearch("");
    setPathHistory((history) =>
      history.index >= history.stack.length - 1
        ? history
        : { ...history, index: history.index + 1 },
    );
  }, []);

  // Persist the collapsed state across sessions.
  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Register the global notifier so any module can push a toast; auto-dismiss after a few seconds.
  useEffect(() => {
    const addToast = (message: string, type: ToastType) => {
      const id = ++toastId.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        4000,
      );
    };

    setNotifier(addToast);
    return () => setNotifier(null);
  }, []);

  // Single domain manager instance for the whole app, provided through context.
  const fs = useMemo(() => new FileSystemManager(), []);

  const fetchVolumes = useCallback(
    async () => setVolumes(await fs.listVolumes()),
    [fs],
  );

  // Read a directory, reporting whether the OS blocked it (Full Disk Access required, e.g. the
  // Trash). Kept free of setState so callers own state updates in their async callbacks.
  const loadDirectory = useCallback(
    async (
      target: string,
    ): Promise<{ files: DirEntry[]; denied: boolean }> => {
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
        path,
        setPath,
        canGoBack: pathHistory.index > 0,
        canGoForward: pathHistory.index < pathHistory.stack.length - 1,
        goBack,
        goForward,
        dirContent,
        setDirContent,
        accessDenied,
        view,
        setView,
        search,
        setSearch,
        refreshDir,
      }}
    >
      <div className={classNames("App", sidebarCollapsed && "collapsed")}>
        <SideBar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
          visitedPaths={pathHistory.stack}
        />
        <AppContent />
      </div>
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </StateProvider>
  );
};

export default App;
