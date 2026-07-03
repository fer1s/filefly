import { useEffect, useState } from "react";

import {
  getAppStorage,
  openPathInNewWindow,
  type AppStorageLocation,
} from "@/shared/services/api";
import { formatBytes } from "@/shared/utils";
import { t } from "@/lang";

// Map a backend storage `kind` to its localized label. Falls back to the raw id for any future
// kind the dictionary doesn't know yet.
const kindLabel = (kind: string): string => {
  if (kind === "config") return t.settings.storageConfig;
  if (kind === "cache") return t.settings.storageCache;
  return kind;
};

// Full-width extra for the Storage setting: the app's total data footprint plus one row per data
// location (config, cache) showing its size and absolute path. Clicking a path opens a new file
// browser window rooted there (openPathInNewWindow). Sizes are summed in Rust off the UI thread, so
// the panel shows a loading hint until the walk resolves. Fetched when the section first renders.
// Takes no props (the schema renders it with CustomControlProps, which it ignores).
const StorageBelow = () => {
  const [locations, setLocations] = useState<AppStorageLocation[] | null>(null);

  useEffect(() => {
    let active = true;
    void getAppStorage()
      .then((result) => {
        if (active) setLocations(result);
      })
      .catch(() => {
        if (active) setLocations([]);
      });
    return () => {
      active = false;
    };
  }, []);

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
            <button
              type="button"
              className="settings_storage_path"
              title={t.settings.storageOpen}
              onClick={() => void openPathInNewWindow(location.path)}
            >
              {location.path}
            </button>
          </span>
          <span className="settings_range_value">
            {formatBytes(location.size)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StorageBelow;
