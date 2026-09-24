import { useSyncExternalStore } from "react";

import {
  DEFAULT_FILE_TYPE_EXTENSIONS,
  type FileTypeExtensions,
} from "@/shared/constants";

import { normalizeFileTypeExtensions } from "./utils";

// The live extension → category map. An external store (ARCHITECTURE_RULES §1) rather than plain
// context because non-React callers need it too: the native drag-preview glyphs (dragPreview.ts)
// and the search-filter kind mapping (filters.ts) run outside any render. The settings state stays
// the source of truth — `setFileTypeExtensions` is called from the app root with every settings
// change, never from a component.
let current: FileTypeExtensions = structuredClone(DEFAULT_FILE_TYPE_EXTENSIONS);

const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// The map as it stands right now, for code that cannot subscribe (non-React callers).
export const getFileTypeExtensions = (): FileTypeExtensions => current;

// Mirror the settings into the store. Normalising here (not at the call site) means a partial or
// hand-edited settings.toml can never leave a category undefined for a consumer.
export const setFileTypeExtensions = (
  extensions: Partial<FileTypeExtensions> | undefined,
): void => {
  const next = normalizeFileTypeExtensions(extensions);
  // Identity is the re-render trigger for useSyncExternalStore, so skip no-op writes (settings are
  // re-applied on every persist) to avoid re-rendering every entry in the folder.
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  current = next;
  listeners.forEach((listener) => listener());
};

// The map for components that branch on file category, re-rendering them when the user edits it.
export const useFileTypeExtensions = (): FileTypeExtensions =>
  useSyncExternalStore(subscribe, getFileTypeExtensions);
