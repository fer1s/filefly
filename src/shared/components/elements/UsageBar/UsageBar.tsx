import { classNames } from "@/shared/utils";

import "@/styles/components/UsageBar.css";

import { usageLevel } from "./utils";
import type { UsageBarProps } from "./types";

// Thin filled bar showing a percentage (disk usage). Emits the `.usage`/`.usage_bar` classes the
// callers' stylesheets already scope, so it drops into volume cards, rows and the sidebar alike.
// The fill is coloured by severity (info / warning / danger — see usageLevel).
const UsageBar = ({ percentage }: UsageBarProps) => (
  <div className="usage">
    <div
      className={classNames("usage_bar", usageLevel(percentage))}
      style={{ width: `${percentage}%` }}
    />
  </div>
);

export default UsageBar;
