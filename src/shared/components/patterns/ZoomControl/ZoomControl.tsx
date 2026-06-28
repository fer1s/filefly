import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import {
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/ZoomControl.css";

import type { ZoomControlProps } from "./types";

// Minus / read-only percentage slider / plus. Shared by the QuickBar (directory zoom) and the
// image Preview (zoom into the image). The +/- buttons drive the value; the slider only
// indicates the current percentage.
const ZoomControl = ({
  value,
  min,
  max,
  onZoomIn,
  onZoomOut,
  zoomInHotkey,
  zoomOutHotkey,
  className,
}: ZoomControlProps) => {
  const percent = Math.round(value * 100);

  return (
    <div className={classNames("zoom_control", className)}>
      <IconButton
        icon={faMagnifyingGlassMinus}
        onClick={onZoomOut}
        disabled={value <= min}
        tooltip={t.quickbar.zoomOut}
        hotkey={zoomOutHotkey}
        aria-label={t.quickbar.zoomOut}
      />
      <input
        type="range"
        className="zoom_slider"
        min={min * 100}
        max={max * 100}
        value={percent}
        readOnly
        tabIndex={-1}
        aria-label={t.quickbar.zoomLevel(percent)}
      />
      <span className="zoom_percent">{percent}%</span>
      <IconButton
        icon={faMagnifyingGlassPlus}
        onClick={onZoomIn}
        disabled={value >= max}
        tooltip={t.quickbar.zoomIn}
        hotkey={zoomInHotkey}
        aria-label={t.quickbar.zoomIn}
      />
    </div>
  );
};

export default ZoomControl;
