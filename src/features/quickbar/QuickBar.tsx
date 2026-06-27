import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { ZOOM_MAX, ZOOM_MIN } from "@/shared/constants";
import { t } from "@/lang";

import {
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/QuickBar.css";

// Secondary bar under the PathBar. Hosts the zoom control: a minus/plus pair around a
// read-only slider that indicates the current zoom percentage of the directory view.
const QuickBar = () => {
  const { zoom, zoomIn, zoomOut } = useStateContext();

  const percent = Math.round(zoom * 100);

  return (
    <div className="QuickBar">
      <div className="zoom_control">
        <IconButton
          icon={faMagnifyingGlassMinus}
          onClick={zoomOut}
          disabled={zoom <= ZOOM_MIN}
          tooltip={t.quickbar.zoomOut}
          aria-label={t.quickbar.zoomOut}
        />
        <input
          type="range"
          className="zoom_slider"
          min={ZOOM_MIN * 100}
          max={ZOOM_MAX * 100}
          value={percent}
          readOnly
          tabIndex={-1}
          aria-label={t.quickbar.zoomLevel(percent)}
        />
        <span className="zoom_percent">{percent}%</span>
        <IconButton
          icon={faMagnifyingGlassPlus}
          onClick={zoomIn}
          disabled={zoom >= ZOOM_MAX}
          tooltip={t.quickbar.zoomIn}
          aria-label={t.quickbar.zoomIn}
        />
      </div>
    </div>
  );
};

export default QuickBar;
