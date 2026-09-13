import { useCallback, useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import type { Tab } from "@/shared/models";
import { MAIN_WINDOW_LABEL } from "@/shared/constants";
import { DEFAULT_FILTERS, type SearchFilters } from "@/shared/search/filters";

import {
  makeTab,
  tabPath,
  navigateTab,
  backTab,
  forwardTab,
  isParentNavigation,
  setTabScrollPosition,
  tabScrollPosition,
  canGoBack,
  canGoForward,
  loadTabs,
  loadActiveTabId,
  saveTabs,
  clearOrphanedWindowSessions,
} from "../../utils";

// Owns the browser-tab session: open tabs, the active one, and all navigation that acts on it
// (path/history/search/info-panel are per-tab). Persists the session across launches.
export const useTabs = (
  activateNewTabs: boolean,
  rememberScrollOnUp: boolean,
) => {
  const [tabs, setTabs] = useState<Tab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    loadActiveTabId(tabs),
  );

  // The active tab drives the current location, history and search. Fall back to the first tab
  // if the active id ever goes stale.
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const path = tabPath(activeTab);
  const infoPanelOpen = activeTab.infoPanelOpen;
  const liveScrollPosition = useRef(tabScrollPosition(activeTab));

  // Apply a transform to the active tab only.
  const updateActiveTab = useCallback(
    (transform: (tab: Tab) => Tab) =>
      setTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? transform(tab) : tab)),
      ),
    [activeTabId],
  );

  const setPath = useCallback(
    (nextPath: string) => {
      const outgoingScrollPosition = liveScrollPosition.current;
      const preview = navigateTab(
        setTabScrollPosition(activeTab, outgoingScrollPosition),
        nextPath,
        rememberScrollOnUp && isParentNavigation(path, nextPath),
      );
      liveScrollPosition.current = tabScrollPosition(preview);
      updateActiveTab((tab) =>
        navigateTab(
          setTabScrollPosition(tab, outgoingScrollPosition),
          nextPath,
          rememberScrollOnUp && isParentNavigation(tabPath(tab), nextPath),
        ),
      );
    },
    [updateActiveTab, activeTab, path, rememberScrollOnUp],
  );

  const goBack = useCallback(() => {
    const outgoingScrollPosition = liveScrollPosition.current;
    const preview = backTab(
      setTabScrollPosition(activeTab, outgoingScrollPosition),
    );
    liveScrollPosition.current = tabScrollPosition(preview);
    updateActiveTab((tab) =>
      backTab(setTabScrollPosition(tab, outgoingScrollPosition)),
    );
  }, [updateActiveTab, activeTab]);

  const goForward = useCallback(() => {
    const outgoingScrollPosition = liveScrollPosition.current;
    const preview = forwardTab(
      setTabScrollPosition(activeTab, outgoingScrollPosition),
    );
    liveScrollPosition.current = tabScrollPosition(preview);
    updateActiveTab((tab) =>
      forwardTab(setTabScrollPosition(tab, outgoingScrollPosition)),
    );
  }, [updateActiveTab, activeTab]);

  // Directory reports its live scroll into this ref. It is committed to the tab model only when
  // leaving the history entry, avoiding an app-wide render and localStorage write on every pixel.
  const reportScrollPosition = useCallback((position: number) => {
    liveScrollPosition.current = Math.max(0, position);
  }, []);

  const setSearch = useCallback(
    (nextSearch: string) =>
      updateActiveTab((tab) => ({ ...tab, search: nextSearch })),
    [updateActiveTab],
  );

  const setFilters = useCallback(
    (nextFilters: SearchFilters) =>
      updateActiveTab((tab) => ({ ...tab, filters: nextFilters })),
    [updateActiveTab],
  );

  const toggleInfoPanel = useCallback(
    () =>
      updateActiveTab((tab) => ({ ...tab, infoPanelOpen: !tab.infoPanelOpen })),
    [updateActiveTab],
  );

  // Open a new tab. An explicit New Tab command (no path) always focuses it; opening a folder or
  // location in a new tab follows the user's activation preference. Panel state is inherited.
  const newTab = useCallback(
    (nextPath?: string) => {
      // Guard against being wired straight to an event handler (onClick / useHotkey), which would
      // otherwise pass the DOM event as `nextPath` and make the tab's path a non-string → crash.
      const start = typeof nextPath === "string" ? nextPath : path;
      const tab = makeTab(start, infoPanelOpen);
      const activate = typeof nextPath !== "string" || activateNewTabs;
      const outgoingScrollPosition = liveScrollPosition.current;
      setTabs((prev) => [
        ...prev.map((item) =>
          activate && item.id === activeTabId
            ? setTabScrollPosition(item, outgoingScrollPosition)
            : item,
        ),
        tab,
      ]);
      if (activate) {
        liveScrollPosition.current = tabScrollPosition(tab);
        setActiveTabId(tab.id);
      }
    },
    [path, infoPanelOpen, activateNewTabs, activeTabId],
  );

  // Close a tab; always keep at least one open. When closing the active tab, activate the
  // neighbour that slides into its place.
  const closeTab = useCallback(
    (id: string) => {
      if (tabs.length <= 1) return;
      const index = tabs.findIndex((tab) => tab.id === id);
      const remaining = tabs.filter((tab) => tab.id !== id);
      setTabs(remaining);
      if (id === activeTabId) {
        const next = remaining[Math.min(index, remaining.length - 1)];
        liveScrollPosition.current = tabScrollPosition(next);
        setActiveTabId(next.id);
      }
    },
    [tabs, activeTabId],
  );

  const selectTab = useCallback(
    (id: string) => {
      if (id === activeTabId) return;
      const next = tabs.find((tab) => tab.id === id);
      if (!next) return;
      const outgoingScrollPosition = liveScrollPosition.current;
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId
            ? setTabScrollPosition(tab, outgoingScrollPosition)
            : tab,
        ),
      );
      liveScrollPosition.current = tabScrollPosition(next);
      setActiveTabId(id);
    },
    [tabs, activeTabId],
  );

  // Move the tab at `from` to position `to` (drag-to-reorder). Bounds-checked; a no-op move
  // leaves the array reference unchanged so React skips the re-render.
  const reorderTab = useCallback((from: number, to: number) => {
    setTabs((prev) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= prev.length ||
        to >= prev.length
      )
        return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // Persist the tab session whenever it changes.
  useEffect(() => {
    saveTabs(tabs, activeTabId);
  }, [tabs, activeTabId]);

  // Purge tab sessions orphaned by closed runtime windows. Runs once at startup from the main
  // window (when no win-N exist), so it never touches a live window's session.
  useEffect(() => {
    if (getCurrentWindow().label === MAIN_WINDOW_LABEL)
      clearOrphanedWindowSessions();
  }, []);

  return {
    tabs,
    activeTabId,
    activeTab,
    path,
    search: activeTab.search,
    filters: activeTab.filters ?? DEFAULT_FILTERS,
    infoPanelOpen,
    scrollRestoreKey: `${activeTab.id}:${activeTab.history.index}`,
    scrollPosition: tabScrollPosition(activeTab),
    canGoBack: canGoBack(activeTab),
    canGoForward: canGoForward(activeTab),
    setPath,
    goBack,
    goForward,
    reportScrollPosition,
    setSearch,
    setFilters,
    toggleInfoPanel,
    newTab,
    closeTab,
    selectTab,
    reorderTab,
  };
};
