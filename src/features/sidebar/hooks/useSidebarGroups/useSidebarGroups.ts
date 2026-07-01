import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getSidebarGroups,
  setSidebarGroupName,
  setSidebarOrder,
  setSidebarItems,
  setHiddenPresets,
  addSidebarGroup,
  deleteSidebarGroup,
  type SidebarGroups,
} from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { basename } from "@/shared/utils";
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
    (id: string, fallback: string) => groups[id]?.name ?? fallback,
    [groups],
  );

  // The groups in display order (built-in + user-created), sorted by their saved `order`, falling
  // back to the built-in position for any group the user hasn't moved yet.
  const order = useMemo(() => {
    const ids = Array.from(
      new Set<string>([...DEFAULT_GROUP_ORDER, ...Object.keys(groups)]),
    );
    const positionOf = (id: string) =>
      groups[id]?.order ?? DEFAULT_GROUP_ORDER.indexOf(id as SidebarGroupId);
    return ids.sort((a, b) => positionOf(a) - positionOf(b));
  }, [groups]);

  // Persist a new top-to-bottom group order, reflecting it immediately. Reverts from disk on a
  // write failure so the UI never shows an order that wasn't saved.
  const reorder = useCallback((ids: string[]) => {
    setGroups((prev) => {
      const next = { ...prev };
      ids.forEach((id, index) => {
        next[id] = { ...next[id], order: index };
      });
      return next;
    });
    setSidebarOrder(ids).catch((error) => {
      console.error("Failed to reorder sidebar groups:\n" + error);
      getSidebarGroups()
        .then(setGroups)
        .catch(() => {});
    });
  }, []);

  // Persist a renamed group, reflecting it immediately and toasting the outcome. On a write
  // failure we revert so the UI never shows a name that isn't on disk.
  const rename = useCallback((id: string, newName: string) => {
    setGroups((prev) => ({ ...prev, [id]: { ...prev[id], name: newName } }));
    setSidebarGroupName(id, newName)
      .then(() => notify(t.sidebar.groupRenamed(newName), TOAST_TYPE.SUCCESS))
      .catch((error) => {
        console.error("Failed to rename sidebar group:\n" + error);
        notify(t.sidebar.groupRenameFailed, TOAST_TYPE.ERROR);
        getSidebarGroups()
          .then(setGroups)
          .catch(() => {});
      });
  }, []);

  // The user-added item paths for a group, in display order.
  const items = useCallback(
    (id: string) => groups[id]?.items ?? [],
    [groups],
  );

  // Add a path to a group at `index` (within its custom items), reflecting it immediately and
  // persisting. No-ops with a toast when the path is already there; reverts from disk on failure.
  const addItem = useCallback(
    (id: string, path: string, index: number) => {
      const current = groups[id]?.items ?? [];
      if (current.includes(path)) {
        notify(t.sidebar.itemAlreadyAdded, TOAST_TYPE.INFO);
        return;
      }
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, path);
      setGroups((prev) => ({ ...prev, [id]: { ...prev[id], items: next } }));
      setSidebarItems(id, next)
        .then(() =>
          notify(t.sidebar.itemAdded(basename(path)), TOAST_TYPE.SUCCESS),
        )
        .catch((error) => {
          console.error("Failed to add sidebar item:\n" + error);
          notify(t.sidebar.itemAddFailed, TOAST_TYPE.ERROR);
          getSidebarGroups()
            .then(setGroups)
            .catch(() => {});
        });
    },
    [groups],
  );

  // Remove a custom item path from a group, reflecting it immediately and persisting. Reverts
  // from disk on a write failure.
  const removeItem = useCallback(
    (id: string, path: string) => {
      const next = (groups[id]?.items ?? []).filter((p) => p !== path);
      setGroups((prev) => ({ ...prev, [id]: { ...prev[id], items: next } }));
      setSidebarItems(id, next)
        .then(() =>
          notify(t.sidebar.itemRemoved(basename(path)), TOAST_TYPE.SUCCESS),
        )
        .catch((error) => {
          console.error("Failed to remove sidebar item:\n" + error);
          notify(t.sidebar.itemRemoveFailed, TOAST_TYPE.ERROR);
          getSidebarGroups()
            .then(setGroups)
            .catch(() => {});
        });
    },
    [groups],
  );

  // The stable ids of built-in presets the user has hidden in a group.
  const hiddenPresets = useCallback(
    (id: string) => groups[id]?.hiddenPresets ?? [],
    [groups],
  );

  // Toggle a built-in preset's hidden state (presets are hidden, never removed), reflecting it
  // immediately and persisting the new set. Reverts from disk on a write failure.
  const toggleHiddenPreset = useCallback(
    (id: string, presetId: string) => {
      const current = groups[id]?.hiddenPresets ?? [];
      const next = current.includes(presetId)
        ? current.filter((p) => p !== presetId)
        : [...current, presetId];
      setGroups((prev) => ({
        ...prev,
        [id]: { ...prev[id], hiddenPresets: next },
      }));
      setHiddenPresets(id, next).catch((error) => {
        console.error("Failed to persist hidden presets:\n" + error);
        getSidebarGroups()
          .then(setGroups)
          .catch(() => {});
      });
    },
    [groups],
  );

  // Whether a group is user-created (renamable + deletable) vs a built-in one.
  const isCustom = useCallback((id: string) => groups[id]?.custom === true, [
    groups,
  ]);

  // Create a user group with a generated id, appended after the current groups. Reflects it
  // immediately; reverts from disk on a write failure.
  const addGroup = useCallback(
    (groupName: string) => {
      const id = crypto.randomUUID();
      const nextOrder = order.length;
      setGroups((prev) => ({
        ...prev,
        [id]: { custom: true, name: groupName, order: nextOrder },
      }));
      addSidebarGroup(id, groupName, nextOrder)
        .then(() => notify(t.sidebar.groupAdded(groupName), TOAST_TYPE.SUCCESS))
        .catch((error) => {
          console.error("Failed to add sidebar group:\n" + error);
          notify(t.sidebar.groupAddFailed, TOAST_TYPE.ERROR);
          getSidebarGroups()
            .then(setGroups)
            .catch(() => {});
        });
      return id;
    },
    [order],
  );

  // Delete a custom group and everything in it, reflecting it immediately. Reverts from disk on a
  // write failure.
  const deleteGroup = useCallback(
    (id: string) => {
      const removed = groups[id]?.name ?? "";
      setGroups((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      deleteSidebarGroup(id)
        .then(() => notify(t.sidebar.groupDeleted(removed), TOAST_TYPE.SUCCESS))
        .catch((error) => {
          console.error("Failed to delete sidebar group:\n" + error);
          notify(t.sidebar.groupDeleteFailed, TOAST_TYPE.ERROR);
          getSidebarGroups()
            .then(setGroups)
            .catch(() => {});
        });
    },
    [groups],
  );

  return {
    name,
    rename,
    order,
    reorder,
    items,
    addItem,
    removeItem,
    hiddenPresets,
    toggleHiddenPreset,
    isCustom,
    addGroup,
    deleteGroup,
  };
};
