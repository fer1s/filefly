import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  useNavigate,
  useLocation,
  NavigateFunction,
  Location,
} from "react-router-dom";

import { StateProvider } from "../shared/providers/StateProvider";

import AppBar from "./AppBar";
import SideBar from "../features/sidebar";
import Toasts, { ToastData } from "../shared/components/Toast";

import AppContent from "./AppContent";

import { setNotifier, ToastType } from "../shared/toast";
import { ROUTES } from "./routes";
import { FileSystemManager } from "../shared/managers/FileSystemManager";
import { Volume, DirEntry } from "../shared/models";
import { classNames } from "../shared/utils";

const App = () => {
  const navigate: NavigateFunction = useNavigate();
  const location: Location = useLocation();

  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [pathHistory, setPathHistory] = useState<{
    stack: string[];
    index: number;
  }>({ stack: [""], index: 0 });
  const [sidebarScrolled, setSidebarScrolled] = useState<boolean>(false);
  const [dirContent, setDirContent] = useState<DirEntry[]>([]);
  const [view, setView] = useState<"list" | "grid">("grid");
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

  const fetchDirectory = useCallback(
    (path: string) => fs.readDirectory(path),
    [fs],
  );

  // Reload the current view (used after filesystem operations like copy/move/rename/delete).
  const refreshDir = useCallback(() => {
    if (path === "") return fetchVolumes();
    fetchDirectory(path).then(setDirContent);
  }, [fetchDirectory, fetchVolumes, path]);

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

    fetchDirectory(path).then((files) => {
      setDirContent(files);
      if (location.pathname !== ROUTES.directory && path !== "")
        navigate(ROUTES.directory);
    });
  }, [fetchDirectory, location.pathname, navigate, path]);

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
        sidebarScrolled,
        setSidebarScrolled,
        dirContent,
        setDirContent,
        view,
        setView,
        search,
        setSearch,
        refreshDir,
      }}
    >
      <AppBar />
      <div className={classNames("App", sidebarCollapsed && "collapsed")}>
        <SideBar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
        <AppContent />
      </div>
      <Toasts
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </StateProvider>
  );
};

export default App;
