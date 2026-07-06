import { useCallback, useEffect, useState } from "react";

import * as api from "@/shared/services/api";
import { SORT_KEY, type SortKey } from "@/features/directory/constants";

import { COLUMN_KEYS, normalizeColumns } from "../../columns";

// Visible list columns for the current folder. Loads the saved preference (or a well-known-folder
// default) from the backend on navigation, and persists toggles per folder. Name is never hidden.
export const useColumnVisibility = (path: string) => {
  const [visible, setVisible] = useState<SortKey[]>(COLUMN_KEYS);

  useEffect(() => {
    let cancelled = false;
    api.getFolderColumns(path).then((cols) => {
      if (!cancelled) setVisible(normalizeColumns(cols));
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  const toggle = useCallback(
    (key: SortKey) => {
      if (key === SORT_KEY.NAME) return; // Name is mandatory.
      const next = visible.includes(key)
        ? visible.filter((k) => k !== key)
        : normalizeColumns([...visible, key]);
      setVisible(next);
      api.setFolderColumns(path, next).catch((err) => {
        console.error("Failed to persist column preference:\n" + err);
      });
    },
    [visible, path],
  );

  return { visible, toggle };
};
