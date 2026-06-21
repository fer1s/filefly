import { t } from "@/lang";

import "@/styles/components/StatusBar.css";

import type { StatusBarProps } from "./types";

// Footer with the total entry count and, when any are selected, the selection count.
const StatusBar = ({ total, selected }: StatusBarProps) => (
  <div className="status_bar">
    <span className="count">{t.directory.itemCount(total)}</span>
    {selected > 0 && (
      <span className="count selected">
        {t.directory.selectedCount(selected)}
      </span>
    )}
  </div>
);

export default StatusBar;
