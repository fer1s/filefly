import { useCallback, useEffect, useState } from "react";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";

import type { AppStorageLocation } from "@/shared/services/api";
import Button from "@/shared/components/elements/Button";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { formatBytes } from "@/shared/utils";
import { STORAGE_KIND } from "@/shared/constants";
import { t } from "@/lang";

import { useSettings } from "../../../providers/SettingsProvider";

// Map a backend storage `kind` to its localized label. Falls back to the raw id for any future
// kind the dictionary doesn't know yet.
const kindLabel = (kind: string): string => {
  if (kind === STORAGE_KIND.CONFIG) return t.settings.storageConfig;
  if (kind === STORAGE_KIND.CACHE) return t.settings.storageCache;
  return kind;
};

// Full-width extra for the Storage setting: the app's total data footprint plus one row per data
// location (config, cache) showing its size and absolute path. Clicking a path opens a new file
// browser window rooted there (openPathInNewWindow). Sizes are summed in Rust off the UI thread, so
// the panel shows a loading hint until the walk resolves. Fetched when the section first renders.
// The cache row carries a trash button to reclaim it (config/data is never clearable); clearing
// refetches so the sizes update in place. Takes no props (the schema renders it with
// CustomControlProps, which it ignores).
const StorageBelow = () => {
  const { manager } = useSettings();
  const { confirm } = useConfirm();
  const [locations, setLocations] = useState<AppStorageLocation[] | null>(null);

  const load = useCallback(
    (signal?: { active: boolean }) =>
      manager
        .getStorage()
        .then((result) => {
          if (!signal || signal.active) setLocations(result);
        })
        .catch(() => {
          if (!signal || signal.active) setLocations([]);
        }),
    [manager],
  );

  useEffect(() => {
    const signal = { active: true };
    void load(signal);
    return () => {
      signal.active = false;
    };
  }, [load]);

  const clearCache = useCallback(async () => {
    const ok = await confirm({
      title: t.settings.storageClear,
      message: t.settings.storageClearConfirm,
      confirmLabel: t.settings.storageClear,
      destructive: true,
    });
    if (!ok) return;
    try {
      await manager.clearCache();
      await load();
      notify(t.settings.storageCleared, TOAST_TYPE.SUCCESS);
    } catch (err) {
      notify(t.settings.storageClearError(String(err)), TOAST_TYPE.ERROR);
    }
  }, [confirm, manager, load]);

  if (locations === null)
    return (
      <div className="settings_row_below">
        <span className="settings_row_hint">{t.settings.storageLoading}</span>
      </div>
    );

  const total = locations.reduce((sum, location) => sum + location.size, 0);

  return (
    <div className="settings_storage">
      <div className="settings_storage_total">
        <span className="settings_row_label">{t.settings.storageTotal}</span>
        <span className="settings_range_value">{formatBytes(total)}</span>
      </div>
      {locations.map((location) => (
        <div key={location.kind} className="settings_storage_row">
          <span className="settings_row_text">
            <span className="settings_row_label">
              {kindLabel(location.kind)}
            </span>
            <Button
              unstyled
              className="settings_storage_path"
              title={t.settings.storageOpen}
              onClick={() => void manager.openPath(location.path)}
            >
              {location.path}
            </Button>
          </span>
          <span className="settings_storage_meta">
            <span className="settings_range_value">
              {formatBytes(location.size)}
            </span>
            {location.kind === STORAGE_KIND.CACHE && location.size > 0 && (
              <IconButton
                icon={faTrashCan}
                size={ICON_BUTTON_SIZE.SM}
                variant={ICON_BUTTON_VARIANT.DANGER}
                tooltip={t.settings.storageClear}
                aria-label={t.settings.storageClear}
                onClick={() => void clearCache()}
              />
            )}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StorageBelow;
