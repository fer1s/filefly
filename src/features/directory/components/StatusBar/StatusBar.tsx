import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import { t } from "@/lang";

import { useImagePreviewLoading } from "../../hooks/useImagePreviewLoading";

import "@/styles/components/StatusBar.css";

import type { StatusBarProps } from "./types";

// Footer with the total entry count and, when any are selected, the selection count.
// Shows spinners on the right while folder sizes are being computed (the list re-sorts as they
// land) and while image thumbnails are still loading.
const StatusBar = ({
  total,
  selected,
  computingSizes,
  savingSettings,
  progress,
}: StatusBarProps) => {
  const loadingPreviews = useImagePreviewLoading();

  const progressPercent =
    progress && progress.total
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <div className="status_bar">
      <span className="count">{t.directory.itemCount(total)}</span>
      {selected > 0 && (
        <span className="count selected">
          {t.directory.selectedCount(selected)}
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
  );
};

export default StatusBar;
