import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import {
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/ZoomControl.css";

import { PERCENT_FACTOR, DEFAULT_SLIDER_STEP } from "./constants";
import type { ZoomControlProps } from "./types";

// Minus / percentage slider / plus. Shared by the QuickBar (directory zoom) and the image
// Preview (zoom into the image). The +/- buttons step the value; when `onZoomTo` is provided the
// slider is interactive and drives the zoom directly, otherwise it's a read-only indicator.
const ZoomControl = ({
  value,
  min,
  max,
  onZoomIn,
  onZoomOut,
  onZoomTo,
  step = DEFAULT_SLIDER_STEP,
  zoomInHotkey,
  zoomOutHotkey,
  className,
}: ZoomControlProps) => {
  const percent = Math.round(value * PERCENT_FACTOR);
  const interactive = Boolean(onZoomTo);

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
        className={classNames("zoom_slider", interactive && "interactive")}
        min={min * PERCENT_FACTOR}
        max={max * PERCENT_FACTOR}
        step={step}
        value={percent}
        onChange={
          onZoomTo
            ? (event) => onZoomTo(Number(event.target.value) / PERCENT_FACTOR)
            : undefined
        }
        readOnly={!interactive}
        tabIndex={interactive ? 0 : -1}
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
