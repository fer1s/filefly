import { t } from "@/lang";
import { basename, isTagsPath, tagFromPath } from "@/shared/utils";
import {
  RECENTS,
  STARTUP_MODE,
  DEFAULT_STARTUP_MODE,
  type StartupMode,
} from "@/shared/constants";
import type { Tab } from "@/shared/models";

import {
  TABS_STORAGE_KEY,
  ACTIVE_TAB_STORAGE_KEY,
  STARTUP_STORAGE_KEY,
} from "./constants";

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
  if (path === "") return t.tabs.volumes;
  if (path === RECENTS) return t.tabs.recents;
  if (isTagsPath(path)) return tagFromPath(path);
  return basename(path);
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

// The launch preference cached in localStorage (see STARTUP_STORAGE_KEY). Read synchronously at
// mount to decide how the session opens.
export type StartupConfig = { mode: StartupMode; homePath: string };

const isStartupMode = (value: unknown): value is StartupMode =>
  value === STARTUP_MODE.RESTORE ||
  value === STARTUP_MODE.VOLUMES ||
  value === STARTUP_MODE.HOME;

// The cached launch preference, or the default (restore) when absent/corrupt.
export const loadStartupConfig = (): StartupConfig => {
  try {
    const raw = localStorage.getItem(STARTUP_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (isStartupMode(parsed.mode))
        return {
          mode: parsed.mode,
          homePath: typeof parsed.homePath === "string" ? parsed.homePath : "",
        };
    }
  } catch {
    // Corrupt storage — fall through to the default.
  }
  return { mode: DEFAULT_STARTUP_MODE, homePath: "" };
};

// Cache the launch preference for the next launch's synchronous tab init.
export const saveStartupConfig = (config: StartupConfig): void =>
  localStorage.setItem(STARTUP_STORAGE_KEY, JSON.stringify(config));

// Restore the persisted tab session, falling back to a single Volumes tab when absent/corrupt.
// Normalises older sessions that predate per-tab fields (e.g. `infoPanelOpen`). When the launch
// preference is a fresh session (Volumes or a home folder), the persisted tabs are ignored and a
// single new tab is opened at the chosen location instead.
export const loadTabs = (): Tab[] => {
  const { mode, homePath } = loadStartupConfig();
  if (mode === STARTUP_MODE.VOLUMES) return [makeTab("")];
  if (mode === STARTUP_MODE.HOME) return [makeTab(homePath)];
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
