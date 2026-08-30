import { useCallback, useEffect, useState } from "react";

import type { CustomContextAction, ContextMenuLayout } from "@/shared/models";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import { useSettings } from "../../../../providers/SettingsProvider";

export const useContextActions = () => {
  const { manager } = useSettings();
  const [layout, setLayout] = useState<ContextMenuLayout | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    manager
      .getContextMenu()
      .then((next) => {
        if (!cancelled) setLayout(next);
      })
      .catch((error) =>
        notify(
          t.settings.contextActionsLoadError(String(error)),
          TOAST_TYPE.ERROR,
        ),
      );
    return () => {
      cancelled = true;
    };
  }, [manager]);

  const save = useCallback(
    async (actions: CustomContextAction[]): Promise<boolean> => {
      if (!layout || saving) return false;
      setSaving(true);
      try {
        setLayout(
          await manager.setContextMenu({
            ...layout,
            custom_action: actions,
          }),
        );
        return true;
      } catch (error) {
        notify(
          t.settings.contextActionsSaveError(String(error)),
          TOAST_TYPE.ERROR,
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [layout, manager, saving],
  );

  return {
    actions: layout?.custom_action ?? null,
    saving,
    save,
  };
};
