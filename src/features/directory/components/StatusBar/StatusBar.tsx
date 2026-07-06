import {
  faSpinner,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import { formatBytes } from "@/shared/utils";
import { openSystemMonitor, openStorageSettings } from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { useSettings } from "@/features/settings";
import { t } from "@/lang";

import { useImagePreviewLoading } from "../../hooks/useImagePreviewLoading";
import { useSystemStats } from "../../hooks/useSystemStats";

import "@/styles/components/StatusBar.css";

import type { StatusBarProps } from "./types";

// Footer with the total entry count and, when any are selected, the selection count.
// Shows spinners on the right while folder sizes are being computed (the list re-sorts as they
// land) and while image thumbnails are still loading.
const StatusBar = ({
  total,
  selected,
  search,
  searchLoading,
  computingSizes,
  savingSettings,
  progress,
}: StatusBarProps) => {
  const loadingPreviews = useImagePreviewLoading();
  const { settings } = useSettings();
  const stats = useSystemStats(settings.showSystemStats);
  const searching = search.length > 0;

  const showStorage = () => {
    openStorageSettings().catch((err) =>
      notify(String(err), TOAST_TYPE.ERROR),
    );
  };

  const showMonitor = () => {
    openSystemMonitor().catch((err) =>
      notify(t.errors.openSystemMonitor(String(err)), TOAST_TYPE.ERROR),
    );
  };

  const progressPercent =
    progress && progress.total
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="status_bar">
      <div className="status_row">
        {searching && (
          <span className="count searching">
            <Icon icon={faMagnifyingGlass} /> {t.directory.searching(search)}
          </span>
        )}
        <span className="count">{t.directory.itemCount(total)}</span>
        {selected > 0 && (
          <span className="count selected">
            {t.directory.selectedCount(selected)}
          </span>
        )}
        {searchLoading && (
          <span className="count busy">
            <Icon icon={faSpinner} spin /> {t.directory.searchRunning}
          </span>
        )}
        {computingSizes && (
          <span className="count busy">
            <Icon icon={faSpinner} spin /> {t.directory.calculatingSizes}
          </span>
        )}
        {loadingPreviews > 0 && (
          <span className="count busy">
            <Icon icon={faSpinner} spin /> {t.directory.loadingPreviews}
          </span>
        )}
        {savingSettings && (
          <span className="count busy">
            <Icon icon={faSpinner} spin /> {t.settings.saving}
          </span>
        )}
        {progress && (
          <span className="count busy progress">
            {progress.label}
            <span className="progress_track">
              <span
                className="progress_bar"
                style={{ width: `${progressPercent}%` }}
              />
            </span>
          </span>
        )}
      </div>
      {stats && (
        <div className="stats_row">
          <button
            type="button"
            className="stat stat_button"
            onClick={showMonitor}
            title={t.directory.openSystemMonitor}
          >
            {t.directory.statCpu(Math.round(stats.cpuUsage))}
          </button>
          <button
            type="button"
            className="stat stat_button"
            onClick={showMonitor}
            title={t.directory.openSystemMonitor}
          >
            {t.directory.statRam(
              formatBytes(stats.memUsed),
              formatBytes(stats.memTotal),
            )}
          </button>
          <button
            type="button"
            className="stat stat_button"
            onClick={showStorage}
            title={t.storage.title}
          >
            {t.directory.statDisk(
              formatBytes(stats.diskUsed),
              formatBytes(stats.diskTotal),
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default StatusBar;
