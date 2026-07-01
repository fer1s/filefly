import { useSyncExternalStore } from "react";

// Session-only history of search queries (not persisted). Shared via a tiny external store so the
// PathBar's search field (which reads/selects/clears) and the directory search (which records a
// query once it settles with results) stay in sync without prop-drilling.

// Max entries kept and shown in the dropdown.
export const MAX_RECENT_SEARCHES = 4;

let recents: string[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// Add a query to the front (de-duped, capped). No-op for blank queries.
const add = (query: string) => {
  const value = query.trim();
  if (!value) return;
  recents = [value, ...recents.filter((r) => r !== value)].slice(
    0,
    MAX_RECENT_SEARCHES,
  );
  emit();
};

const clear = () => {
  if (!recents.length) return;
  recents = [];
  emit();
};

export const recentSearchesStore = { add, clear, get: () => recents };

// React binding for the store; returns the list plus the mutators.
export const useRecentSearches = () => {
  const list = useSyncExternalStore(subscribe, () => recents);
  return { recents: list, addRecent: add, clearRecents: clear };
};
