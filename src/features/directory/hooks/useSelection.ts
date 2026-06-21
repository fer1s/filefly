import { useState } from "react";
import type { MouseEvent } from "react";

// Selection of directory entries (by path). Single click replaces the selection;
// Ctrl (or Cmd on macOS) + click toggles the entry in/out of the selection.
export const useSelection = () => {
  const [selectedIDs, setSelectedIDs] = useState<string[]>([]);

  const handleSelect = (id: string, e: MouseEvent) => {
    const additive = e.ctrlKey || e.metaKey;
    setSelectedIDs((prev) =>
      additive
        ? prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id]
        : [id],
    );
  };

  const clearSelection = () => setSelectedIDs([]);

  return { selectedIDs, setSelectedIDs, handleSelect, clearSelection };
};
