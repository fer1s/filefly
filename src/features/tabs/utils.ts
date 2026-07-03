import { t } from "@/lang";
import { basename, isTagsPath, tagFromPath } from "@/shared/utils";
import { DEFAULT_FILTERS, isSearchFilters } from "@/shared/search/filters";
import {
  RECENTS,
  STARTUP_MODE,
  DEFAULT_STARTUP_MODE,
  MAIN_WINDOW_LABEL,
  type StartupMode,
} from "@/shared/constants";
import type { Tab } from "@/shared/models";

import { getCurrentWindow } from "@tauri-apps/api/window";

import {
  TABS_STORAGE_KEY,
  ACTIVE_TAB_STORAGE_KEY,
  STARTUP_STORAGE_KEY,
} from "./constants";
import type { StartupConfig, TabGeom } from "./types";

// Tab sessions are per-window: localStorage is shared across all windows of the same origin, so
// each window namespaces its keys by its label. "main" keeps the bare keys for backward compat
// (its session restores on launch); runtime windows ("win-N") get their own, starting fresh.
const windowSuffix = (): string => {
  try {
    const label = getCurrentWindow().label;
    return label === MAIN_WINDOW_LABEL ? "" : `:${label}`;
  } catch {
    // Non-Tauri context (e.g. tests) — behave like the single-window default.
    return "";
  }
};

const tabsKey = (): string => `${TABS_STORAGE_KEY}${windowSuffix()}`;
const activeTabKey = (): string => `${ACTIVE_TAB_STORAGE_KEY}${windowSuffix()}`;

// A fresh tab rooted at `path` (empty string = the Volumes view). `infoPanelOpen` lets a new tab
// inherit the current tab's panel state so opening one feels continuous.
export const makeTab = (path: string, infoPanelOpen = false): Tab => ({
  id: crypto.randomUUID(),
  history: { stack: [path], index: 0 },
  search: "",
  filters: DEFAULT_FILTERS,
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
    filters: DEFAULT_FILTERS,
  };
};

export const backTab = (tab: Tab): Tab =>
  tab.history.index === 0
    ? tab
    : {
        ...tab,
        history: { ...tab.history, index: tab.history.index - 1 },
        search: "",
        filters: DEFAULT_FILTERS,
      };

export const forwardTab = (tab: Tab): Tab =>
  tab.history.index >= tab.history.stack.length - 1
    ? tab
    : {
        ...tab,
        history: { ...tab.history, index: tab.history.index + 1 },
        search: "",
        filters: DEFAULT_FILTERS,
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

// A window opened at a specific folder carries it as a `startPath` query param (see window.rs
// open_path_in_new_window). Read once at mount; when present it wins over the startup preference
// so the window opens a single tab there. Percent-decoded to recover the original path.
const startPathFromUrl = (): string | null => {
  try {
    return new URLSearchParams(window.location.search).get("startPath");
  } catch {
    // Non-Tauri context (e.g. tests) or unparsable URL — no override.
    return null;
  }
};

// Restore the persisted tab session, falling back to a single Volumes tab when absent/corrupt.
// Normalises older sessions that predate per-tab fields (e.g. `infoPanelOpen`). When the launch
// preference is a fresh session (Volumes or a home folder), the persisted tabs are ignored and a
// single new tab is opened at the chosen location instead. A `startPath` query param (a window
// opened at a specific folder) overrides everything: open a single tab rooted there.
export const loadTabs = (): Tab[] => {
  const startPath = startPathFromUrl();
  if (startPath !== null) return [makeTab(startPath)];
  const { mode, homePath } = loadStartupConfig();
  if (mode === STARTUP_MODE.VOLUMES) return [makeTab("")];
  if (mode === STARTUP_MODE.HOME) return [makeTab(homePath)];
  try {
    const raw = localStorage.getItem(tabsKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isTab))
        return parsed.map((tab) => ({
          ...tab,
          infoPanelOpen: tab.infoPanelOpen ?? false,
          filters: isSearchFilters(tab.filters) ? tab.filters : DEFAULT_FILTERS,
        }));
    }
  } catch {
    // Corrupt storage — fall through to a fresh session.
  }
  return [makeTab("")];
};

// The persisted active tab id, validated against the loaded tabs.
export const loadActiveTabId = (tabs: Tab[]): string => {
  const saved = localStorage.getItem(activeTabKey());
  return tabs.some((tab) => tab.id === saved) ? (saved as string) : tabs[0].id;
};

export const saveTabs = (tabs: Tab[], activeTabId: string): void => {
  localStorage.setItem(tabsKey(), JSON.stringify(tabs));
  localStorage.setItem(activeTabKey(), activeTabId);
};

// Remove tab sessions left behind by runtime windows ("win-N"). Those windows are ephemeral — they
// aren't recreated on launch — so their keyed sessions would otherwise accumulate in localStorage
// forever. Called once from the main window at startup, when no runtime windows exist yet, so it
// can't clobber a live window's session. Doing it here (rather than on window close) avoids
// depending on close/unload events, which Tauri's onCloseRequested blocks and WKWebView fires
// unreliably.
export const clearOrphanedWindowSessions = (): void => {
  const prefixes = [`${TABS_STORAGE_KEY}:`, `${ACTIVE_TAB_STORAGE_KEY}:`];
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
      localStorage.removeItem(key);
    }
  }
};

// Clamp the raw pointer offset so the dragged tab can't leave the strip — its left edge stops at
// the strip's left and its right edge at the last tab's end (so it never overlaps the "+" or
// slides under the sidebar).
export const clampDx = (
  geom: TabGeom[] | null,
  index: number,
  mx: number,
): number => {
  if (!geom) return mx;
  const el = geom[index];
  const minDx = geom[0].left - el.left;
  const maxDx = geom[geom.length - 1].right - el.right;
  return Math.max(minDx, Math.min(maxDx, mx));
};

// Where the dragged tab should land: the count of other tabs whose center sits left of the
// pointer-projected center. Uses the RAW offset (not clamped) so a wide tab can still reach a
// slot occupied by a narrower tab. That count is exactly the splice index.
export const dropIndex = (
  geom: TabGeom[] | null,
  index: number,
  mx: number,
): number => {
  if (!geom) return index;
  const draggedCenter = geom[index].center + mx;
  let target = 0;
  geom.forEach((g, i) => {
    if (i !== index && g.center < draggedCenter) target += 1;
  });
  return target;
};
