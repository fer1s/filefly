import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";

import { isMacPlatform } from "@/shared/keymap";

// Toggle modifier for multi-select: Cmd on macOS, Ctrl elsewhere. On macOS Ctrl+click is the
// native secondary (right) click, so using it here would also fire the context menu.
const isMac = isMacPlatform();

// Selection of directory entries (by path). Single click replaces the selection; the
// platform's toggle modifier + click adds/removes one entry; Shift + click selects the range
// between the anchor (last plainly-clicked entry) and the clicked one.
//
// `orderedIDs` is the entries in display order, needed to resolve a Shift range. It's kept in a
// ref so `handleSelect` stays stable and memoized rows don't re-render on unrelated changes.
export const useSelection = (orderedIDs: string[]) => {
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);
  const anchorRef = useRef<string | null>(null);
  const orderRef = useRef(orderedIDs);
  useEffect(() => {
    orderRef.current = orderedIDs;
  }, [orderedIDs]);

  const handleSelect = useCallback((id: string, e: MouseEvent) => {
    const order = orderRef.current;

    // Shift extends from the anchor; the anchor itself doesn't move, so repeated Shift+clicks
    // grow/shrink the range from the same origin (Finder/Explorer behaviour).
    if (e.shiftKey && anchorRef.current) {
      const from = order.indexOf(anchorRef.current);
      const to = order.indexOf(id);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from];
        setSelectedIDs(order.slice(lo, hi + 1));
        return;
      }
    }

    anchorRef.current = id;
    const additive = isMac ? e.metaKey : e.ctrlKey;
    setSelectedIDs((prev) =>
      additive
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id],
    );
  }, []);

  const clearSelection = useCallback(() => setSelectedIDs([]), []);

  return { selectedIDs, setSelectedIDs, handleSelect, clearSelection };
};
