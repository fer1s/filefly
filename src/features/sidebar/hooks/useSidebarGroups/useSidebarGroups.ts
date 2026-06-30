import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getSidebarGroups,
  setSidebarGroupName,
  setSidebarOrder,
  type SidebarGroups,
} from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import { DEFAULT_GROUP_ORDER, type SidebarGroupId } from "../../constants";

// Owns the per-group sidebar customization (currently just custom names): hydrates it from
// sidebar.toml on launch and persists every rename back. sidebar.toml is the source of truth —
// this hook is its in-memory mirror plus the write-back, surfacing a toast on success/failure.
export const useSidebarGroups = () => {
  const [groups, setGroups] = useState<SidebarGroups>({});

  useEffect(() => {
    getSidebarGroups()
      .then(setGroups)
      .catch((error) =>
        console.error("Failed to load sidebar groups:\n" + error),
      );
  }, []);

  // The display name for a group: the saved override if any, otherwise the built-in label.
  const name = useCallback(
    (id: SidebarGroupId, fallback: string) => groups[id]?.name ?? fallback,
    [groups],
  );

  // The groups in display order: sorted by their saved `order`, falling back to the built-in
  // position for any group the user hasn't moved yet.
  const order = useMemo(() => {
    const positionOf = (id: SidebarGroupId) =>
      groups[id]?.order ?? DEFAULT_GROUP_ORDER.indexOf(id);
    return [...DEFAULT_GROUP_ORDER].sort(
      (a, b) => positionOf(a) - positionOf(b),
    );
  }, [groups]);

  // Persist a new top-to-bottom group order, reflecting it immediately. Reverts from disk on a
  // write failure so the UI never shows an order that wasn't saved.
  const reorder = useCallback((ids: SidebarGroupId[]) => {
    setGroups((prev) => {
      const next = { ...prev };
      ids.forEach((id, index) => {
        next[id] = { ...next[id], order: index };
      });
      return next;
    });
    setSidebarOrder(ids).catch((error) => {
      console.error("Failed to reorder sidebar groups:\n" + error);
      getSidebarGroups().then(setGroups).catch(() => {});
    });
  }, []);

  // Persist a renamed group, reflecting it immediately and toasting the outcome. On a write
  // failure we revert so the UI never shows a name that isn't on disk.
  const rename = useCallback((id: SidebarGroupId, newName: string) => {
    setGroups((prev) => ({ ...prev, [id]: { ...prev[id], name: newName } }));
    setSidebarGroupName(id, newName)
      .then(() => notify(t.sidebar.groupRenamed(newName), TOAST_TYPE.SUCCESS))
      .catch((error) => {
        console.error("Failed to rename sidebar group:\n" + error);
        notify(t.sidebar.groupRenameFailed, TOAST_TYPE.ERROR);
        getSidebarGroups().then(setGroups).catch(() => {});
      });
  }, []);

  return { name, rename, order, reorder };
};
