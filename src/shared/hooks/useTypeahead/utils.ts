import type { TypeaheadItem } from "./types";

// Where a type-to-find search starts: a single-character query starts just after the current item
// so repeated presses cycle through matches; longer queries refine from the top of the list.
export const typeaheadStartIndex = (query: string, currentIndex: number) =>
  query.length === 1 ? currentIndex + 1 : 0;

// The first item (wrapping from `startIndex`) whose name starts with the lowercased `query`.
export const findTypeaheadMatch = <T extends TypeaheadItem>(
  items: readonly T[],
  query: string,
  startIndex: number,
): T | undefined => {
  if (!items.length || !query) return undefined;
  for (let i = 0; i < items.length; i++) {
    const item = items[(startIndex + i) % items.length];
    if (item.name.toLowerCase().startsWith(query)) return item;
  }
  return undefined;
};
