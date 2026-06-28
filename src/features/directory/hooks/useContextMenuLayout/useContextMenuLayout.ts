import { useEffect, useState } from "react";

import { getContextMenu } from "@/shared/services/api";
import type { ContextMenuLayout } from "@/shared/models";

import { EMPTY_LAYOUT } from "./constants";

// Load the context-menu layout once (from context_menu.toml / bundled defaults). The menu
// opens on right-click, well after mount, so the empty initial value is never seen.
export const useContextMenuLayout = (): ContextMenuLayout => {
  const [layout, setLayout] = useState<ContextMenuLayout>(EMPTY_LAYOUT);

  useEffect(() => {
    let cancelled = false;
    getContextMenu()
      .then((next) => {
        if (!cancelled) setLayout(next);
      })
      .catch((err) => console.error("Failed to load context menu layout:\n" + err));
    return () => {
      cancelled = true;
    };
  }, []);

  return layout;
};
