import { useStateContext } from "@/shared/providers/StateProvider";
import ZoomControl from "@/shared/components/patterns/ZoomControl";
import { ZOOM_MAX, ZOOM_MIN } from "@/shared/constants";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { QuickActions } from "@/features/directory";

import "@/styles/components/QuickBar.css";

// Secondary bar under the PathBar. Quick actions on the left; the directory zoom control on
// the right.
const QuickBar = () => {
  const { zoom, zoomIn, zoomOut } = useStateContext();
  const { keymap } = useKeymap();

  return (
    <div className="QuickBar">
      <QuickActions />
      <ZoomControl
        value={zoom}
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        zoomInHotkey={formatBinding(keymap[KEYMAP_ACTION.ZOOM_IN])}
        zoomOutHotkey={formatBinding(keymap[KEYMAP_ACTION.ZOOM_OUT])}
      />
    </div>
  );
};

export default QuickBar;
