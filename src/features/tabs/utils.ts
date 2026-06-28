import { t } from "@/lang";
import { basename } from "@/shared/utils";
import type { Tab } from "@/shared/models";

import { TABS_STORAGE_KEY, ACTIVE_TAB_STORAGE_KEY } from "./constants";

// A fresh tab rooted at `path` (empty string = the Volumes view). `infoPanelOpen` lets a new tab
// inherit the current tab's panel state so opening one feels continuous.
export const makeTab = (path: string, infoPanelOpen = false): Tab => ({
  id: crypto.randomUUID(),
  history: { stack: [path], index: 0 },
  search: "",
  infoPanelOpen,
});

// The path the tab currently points at.
export const tabPath = (tab: Tab): string =>
  tab.history.stack[tab.history.index];

// Navigate the tab to `path`: truncate any forward history and push the new entry. Clears the
// tab's search (a new location starts unfiltered). No-op when already there.
export const navigateTab = (tab: Tab, path: string): Tab => {
  const { stack, index } = tab.history;
  if (stack[index] === path) return tab;
  const nextStack = [...stack.slice(0, index + 1), path];
  return {
    ...tab,
    history: { stack: nextStack, index: nextStack.length - 1 },
    search: "",
  };
};

export const backTab = (tab: Tab): Tab =>
  tab.history.index === 0
    ? tab
    : {
        ...tab,
        history: { ...tab.history, index: tab.history.index - 1 },
        search: "",
      };

export const forwardTab = (tab: Tab): Tab =>
  tab.history.index >= tab.history.stack.length - 1
    ? tab
    : {
        ...tab,
        history: { ...tab.history, index: tab.history.index + 1 },
        search: "",
      };

export const canGoBack = (tab: Tab): boolean => tab.history.index > 0;

export const canGoForward = (tab: Tab): boolean =>
  tab.history.index < tab.history.stack.length - 1;

// The label shown on the tab: the folder name, or the Volumes label at the root.
export const tabLabel = (tab: Tab): string => {
  const path = tabPath(tab);
  return path === "" ? t.tabs.volumes : basename(path);
};

// Whether a persisted value has the shape of a Tab (defensive against corrupt localStorage).
const isTab = (value: unknown): value is Tab => {
  if (typeof value !== "object" || value === null) return false;
  const tab = value as Record<string, unknown>;
  const history = tab.history as Record<string, unknown> | undefined;
  return (
    typeof tab.id === "string" &&
    typeof tab.search === "string" &&
    typeof history === "object" &&
    history !== null &&
    Array.isArray(history.stack) &&
    history.stack.every((entry) => typeof entry === "string") &&
    typeof history.index === "number"
  );
};

// Restore the persisted tab session, falling back to a single Volumes tab when absent/corrupt.
// Normalises older sessions that predate per-tab fields (e.g. `infoPanelOpen`).
export const loadTabs = (): Tab[] => {
  try {
    const raw = localStorage.getItem(TABS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isTab))
        return parsed.map((tab) => ({
          ...tab,
          infoPanelOpen: tab.infoPanelOpen ?? false,
        }));
    }
  } catch {
    // Corrupt storage — fall through to a fresh session.
  }
  return [makeTab("")];
};

// The persisted active tab id, validated against the loaded tabs.
export const loadActiveTabId = (tabs: Tab[]): string => {
  const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
  return tabs.some((tab) => tab.id === saved) ? (saved as string) : tabs[0].id;
};

export const saveTabs = (tabs: Tab[], activeTabId: string): void => {
  localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
};
