import { faSpinner } from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import { t } from "@/lang";

import { useImagePreviewLoading } from "../../hooks/useImagePreviewLoading";

import "@/styles/components/StatusBar.css";

import type { StatusBarProps } from "./types";

// Footer with the total entry count and, when any are selected, the selection count.
// Shows a spinner on the right while image thumbnails are still loading.
const StatusBar = ({ total, selected }: StatusBarProps) => {
  const loadingPreviews = useImagePreviewLoading();

  return (
    <div className="status_bar">
      <span className="count">{t.directory.itemCount(total)}</span>
      {selected > 0 && (
        <span className="count selected">
          {t.directory.selectedCount(selected)}
        </span>
      )}
      {loadingPreviews > 0 && (
        <span className="count previews">
          <Icon icon={faSpinner} spin /> {t.directory.loadingPreviews}
        </span>
      )}
    </div>
  );
};

export default StatusBar;
