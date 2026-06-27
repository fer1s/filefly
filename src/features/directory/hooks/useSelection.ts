import { useCallback, useState } from "react";
import type { MouseEvent } from "react";

import { isMacPlatform } from "@/shared/keymap";

// Toggle modifier for multi-select: Cmd on macOS, Ctrl elsewhere. On macOS Ctrl+click is the
// native secondary (right) click, so using it here would also fire the context menu.
const isMac = isMacPlatform();

// Selection of directory entries (by path). Single click replaces the selection;
// the platform's toggle modifier + click adds/removes the entry from the selection.
export const useSelection = () => {
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);

  // Stable so memoized entry rows don't re-render when an unrelated row changes.
  const handleSelect = useCallback((id: string, e: MouseEvent) => {
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
