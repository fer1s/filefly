import "@/styles/components/UsageBar.css";

import type { UsageBarProps } from "./types";

// Thin filled bar showing a percentage (disk usage). Emits the `.usage`/`.usage_bar` classes the
// callers' stylesheets already scope, so it drops into volume cards, rows and the sidebar alike.
const UsageBar = ({ percentage }: UsageBarProps) => (
  <div className="usage">
    <div className="usage_bar" style={{ width: `${percentage}%` }} />
  </div>
);

export default UsageBar;
