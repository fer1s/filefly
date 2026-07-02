import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type CSSProperties,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { StateProvider } from "@/shared/providers/StateProvider";
import { ModalProvider } from "@/shared/providers/ModalProvider";
import { ConfirmProvider } from "@/shared/providers/ConfirmProvider";
import { FolderPickerProvider } from "@/shared/providers/FolderPickerProvider";
import { TagsProvider } from "@/shared/providers/TagsProvider";
import {
  KeymapProvider,
  HotkeyProvider,
  ShortcutHelpProvider,
} from "@/shared/keymap";

import SideBar, { SidebarResizeHandle } from "@/features/sidebar";
import ShortcutsDialog from "@/features/shortcuts";
import { SettingsProvider } from "@/features/settings";
import { useTabs, saveStartupConfig } from "@/features/tabs";
import ToastStack from "@/shared/components/patterns/ToastStack";

import AppContent from "./AppContent";
import { useToasts } from "./hooks/useToasts";
import { useZoom } from "./hooks/useZoom";
import { useDirectoryContents } from "./hooks/useDirectoryContents";
import { useSidebarCollapsed } from "./hooks/useSidebarCollapsed";
import { useAppSettings } from "./hooks/useAppSettings";
import { useDockMenu } from "./hooks/useDockMenu";
import { useTheme } from "./hooks/useTheme";
import { useAccent } from "./hooks/useAccent";
import { useControlBridge } from "./hooks/useControlBridge";

import { notify, setToastsEnabled, TOAST_TYPE } from "@/shared/toast";
import { prewarmDragIcon } from "@/shared/services/api";
import { prewarmDragGlyphs } from "@/features/directory/dragPreview";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";
import {
  VIEW_MODE,
  type ViewMode,
  type StartupMode,
  type DragDropAction,
  type Theme,
  type Accent,
} from "@/shared/constants";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Single domain manager instance for the whole app, provided through context.
  const fs = useMemo(() => new FileSystemManager(), []);

  // Each concern owns its own state and side effects; the composition root just wires them
  // together into the shared context (see ARCHITECTURE_RULES §6, §4).
  const tabs = useTabs();
  // App-wide settings persisted in settings.toml; hydrated on launch.
  const {
    settings,
    update,
    saving: savingSettings,
    ready: settingsReady,
  } = useAppSettings();
  const directory = useDirectoryContents({
    fs,
    path: tabs.path,
    navigate,
    locationPathname: location.pathname,
    hideSystemRecents: settings.hideSystemRecents,
  });
  useTheme(settings.theme as Theme);
  useAccent(settings.accentColor as Accent);
  const zoom = useZoom(fs, tabs.path, settings.defaultZoom);
  const { toasts, dismissToast } = useToasts();
  const sidebar = useSidebarCollapsed();

  // Feed the macOS Dock right-click menu (recent folders + quick actions) and handle its clicks.
  useDockMenu({
    path: tabs.path,
    newTab: tabs.newTab,
    homePath: settings.homePath,
  });

  const [view, setView] = useState<ViewMode>(VIEW_MODE.GRID);

  // Bridge this window to the headless control channel (`sfb ui …` / MCP): mirror UI state to Rust
  // and apply inbound navigate requests.
  useControlBridge({
    tabs: tabs.tabs,
    activeTabId: tabs.activeTabId,
    path: tabs.path,
    view,
    setPath: tabs.setPath,
  });

  const toggleShowHidden = useCallback(() => {
    const next = !settings.showHidden;
    update({ showHidden: next });
    notify(
      next ? t.directory.showingHidden : t.directory.hidingHidden,
      TOAST_TYPE.INFO,
    );
  }, [settings.showHidden, update]);

  const toggleHideSystemRecents = useCallback(
    () => update({ hideSystemRecents: !settings.hideSystemRecents }),
    [settings.hideSystemRecents, update],
  );

  const toggleShowToasts = useCallback(
    () => update({ showToasts: !settings.showToasts }),
    [settings.showToasts, update],
  );

  const toggleConfirmDragDrop = useCallback(
    () => update({ confirmDragDrop: !settings.confirmDragDrop }),
    [settings.confirmDragDrop, update],
  );

  const toggleClickableToasts = useCallback(
    () => update({ clickableToasts: !settings.clickableToasts }),
    [settings.clickableToasts, update],
  );

  const toggleDragToExternalApps = useCallback(
    () => update({ dragToExternalApps: !settings.dragToExternalApps }),
    [settings.dragToExternalApps, update],
  );

  // Keep the toast bridge's enabled flag in sync so notify() (callable from non-React code)
  // honors the setting.
  useEffect(() => {
    setToastsEnabled(settings.showToasts);
  }, [settings.showToasts]);

  // Dialogs render outside the .App subtree (their providers wrap it), so the modal-surface opacity
  // is set on the document root where they can inherit it (see Dialog.css). Mirrors the inline
  // --context-menu-opacity used for menus, which do live inside .App.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--dialog-opacity",
      String(settings.dialogOpacity),
    );
  }, [settings.dialogOpacity]);

  // Mirror the launch preference into localStorage so the next launch's (synchronous) tab
  // restoration can read it before settings.toml has finished loading.
  useEffect(() => {
    saveStartupConfig({
      mode: settings.startupMode as StartupMode,
      homePath: settings.homePath,
    });
  }, [settings.startupMode, settings.homePath]);

  // Prepare the native-drag previews once (bundled fallback icon + rasterised type glyphs), so a
  // drag can pick its image synchronously.
  useEffect(() => {
    void prewarmDragIcon();
    void prewarmDragGlyphs();
  }, []);

  // The window launches hidden (tauri.conf visible:false) to avoid a blank-window flash while the
  // webview cold-starts and the first listing loads. Reveal it once settings and the initial
  // listing are ready so it appears fully painted. A fallback timer guarantees the window is never
  // left hidden if some load hangs.
  const windowShown = useRef(false);
  const revealWindow = useCallback(() => {
    if (windowShown.current) return;
    windowShown.current = true;
    const win = getCurrentWindow();
    void win.show();
    void win.setFocus();
  }, []);
  const contentReady = settingsReady && directory.ready;
  useEffect(() => {
    if (contentReady) revealWindow();
  }, [contentReady, revealWindow]);
  useEffect(() => {
    const fallback = window.setTimeout(revealWindow, 4000);
    return () => window.clearTimeout(fallback);
  }, [revealWindow]);

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
        reorderTab: tabs.reorderTab,
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
        showHidden: settings.showHidden,
        toggleShowHidden,
        hideSystemRecents: settings.hideSystemRecents,
        toggleHideSystemRecents,
        showToasts: settings.showToasts,
        toggleShowToasts,
        zoom: zoom.zoom,
        zoomIn: zoom.zoomIn,
        zoomOut: zoom.zoomOut,
        setZoomTo: zoom.setZoomTo,
        defaultZoom: settings.defaultZoom,
        setDefaultZoom: (defaultZoom) => update({ defaultZoom }),
        dateFormat: settings.dateFormat,
        setDateFormat: (dateFormat) => update({ dateFormat }),
        sidebarOpacity: settings.sidebarOpacity,
        setSidebarOpacity: (sidebarOpacity) => update({ sidebarOpacity }),
        sidebarWidth: settings.sidebarWidth,
        setSidebarWidth: (sidebarWidth) => update({ sidebarWidth }),
        startupMode: settings.startupMode as StartupMode,
        setStartupMode: (startupMode) => update({ startupMode }),
        homePath: settings.homePath,
        setHomePath: (homePath) => update({ homePath }),
        dragDropAction: settings.dragDropAction as DragDropAction,
        setDragDropAction: (dragDropAction) => update({ dragDropAction }),
        confirmDragDrop: settings.confirmDragDrop,
        toggleConfirmDragDrop,
        confirmDelete: settings.confirmDelete,
        clickableToasts: settings.clickableToasts,
        toggleClickableToasts,
        dragToExternalApps: settings.dragToExternalApps,
        toggleDragToExternalApps,
        previewImagesInApp: settings.previewImagesInApp,
        savingSettings,
        search: tabs.search,
        setSearch: tabs.setSearch,
        refreshDir: directory.refreshDir,
        infoPanelOpen: tabs.infoPanelOpen,
        toggleInfoPanel: tabs.toggleInfoPanel,
      }}
    >
      <ModalProvider>
        <TagsProvider>
          <KeymapProvider>
            <HotkeyProvider>
              {/* Inside HotkeyProvider so the confirm dialog's Escape-to-close (a MODAL-scope
                  hotkey) and modal-scope suppression actually register. */}
              <ConfirmProvider>
              {/* Custom folder picker (vs native Finder dialog); inside HotkeyProvider/ModalProvider
                  so its dialog gets MODAL-scope suppression and focus trapping like other dialogs. */}
              <FolderPickerProvider useCustom={settings.useCustomFolderPicker}>
              <ShortcutHelpProvider>
                <SettingsProvider settings={settings} update={update}>
                  <div
                    className={classNames(
                      "App",
                      sidebar.collapsed && "collapsed",
                    )}
                    // Expanded-column width; the collapsed rule overrides it (see index.css).
                    style={
                      {
                        "--sidebar-width": `${settings.sidebarWidth}px`,
                        // Alpha of the context-menu background (see ContextMenu.css); menus are
                        // descendants of .App, so they inherit this override.
                        "--context-menu-opacity": settings.contextMenuOpacity,
                      } as CSSProperties
                    }
                  >
                    <SideBar
                      collapsed={sidebar.collapsed}
                      onToggle={sidebar.toggle}
                    />
                    {!sidebar.collapsed && <SidebarResizeHandle />}
                    <AppContent />
                  </div>
                </SettingsProvider>
                <ShortcutsDialog />
                <ToastStack toasts={toasts} onDismiss={dismissToast} />
              </ShortcutHelpProvider>
              </FolderPickerProvider>
              </ConfirmProvider>
            </HotkeyProvider>
          </KeymapProvider>
        </TagsProvider>
      </ModalProvider>
    </StateProvider>
  );
};

export default App;
