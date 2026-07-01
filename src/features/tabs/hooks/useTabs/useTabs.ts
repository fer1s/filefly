import { useCallback, useEffect, useState } from "react";

import type { Tab } from "@/shared/models";

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
} from "../../utils";

// Owns the browser-tab session: open tabs, the active one, and all navigation that acts on it
// (path/history/search/info-panel are per-tab). Persists the session across launches.
export const useTabs = () => {
  const [tabs, setTabs] = useState<Tab[]>(loadTabs);
  const [activeTabId, setActiveTabId] = useState<string>(() =>
    loadActiveTabId(tabs),
  );

  // The active tab drives the current location, history and search. Fall back to the first tab
  // if the active id ever goes stale.
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];
  const path = tabPath(activeTab);
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

  const goBack = useCallback(() => updateActiveTab(backTab), [updateActiveTab]);

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

  // Open a new tab and focus it. Defaults to cloning the current location; pass a path to open
  // the new tab there instead (e.g. the sidebar's "Open in new tab"). Panel state is inherited.
  const newTab = useCallback(
    (nextPath?: string) => {
      const tab = makeTab(nextPath ?? path, infoPanelOpen);
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    },
    [path, infoPanelOpen],
  );

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

  return {
    tabs,
    activeTabId,
    activeTab,
    path,
    search: activeTab.search,
    infoPanelOpen,
    canGoBack: canGoBack(activeTab),
    canGoForward: canGoForward(activeTab),
    setPath,
    goBack,
    goForward,
    setSearch,
    toggleInfoPanel,
    newTab,
    closeTab,
    selectTab,
  };
};
