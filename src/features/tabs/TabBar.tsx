import { useEffect, useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { faPlus } from "@fortawesome/free-solid-svg-icons";

import { useStateContext } from "@/shared/providers/StateProvider";
import { useKeymap, formatBinding, KEYMAP_ACTION } from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import { t } from "@/lang";

import TabItem from "./components/TabItem";
import { clampDx, dropIndex } from "./utils";
import { TAB_DRAG_THRESHOLD_PX } from "./constants";
import type { TabGeom, TabDragState } from "./types";

import "@/styles/components/TabBar.css";

// Browser-style tab strip above the PathBar. Tabs can be dragged horizontally to reorder them
// (@use-gesture), and the trailing "+" opens a new tab beside the last one.
const TabBar = () => {
  const { tabs, activeTabId, closeTab, selectTab, newTab, reorderTab } =
    useStateContext();
  const { keymap } = useKeymap();

  const closable = tabs.length > 1;
  const closeHotkey = formatBinding(keymap[KEYMAP_ACTION.CLOSE_TAB]);
  const newTabHotkey = formatBinding(keymap[KEYMAP_ACTION.NEW_TAB]);

  const stripRef = useRef<HTMLDivElement>(null);
  // The tab currently being dragged and how far (px) it has moved from its resting position.
  // `dx` is the clamped offset used to render the tab (stays inside the strip). `mx` is the raw
  // pointer movement, used to pick the target slot — so intent isn't capped by the visual clamp
  // (e.g. dragging a wide tab onto a narrower last tab still reaches the final slot). `geom` is
  // the layout snapshot taken at drag start, carried in state so render never reads the ref.
  const [drag, setDrag] = useState<TabDragState | null>(null);
  // True for the single frame after a drop: the reorder just committed, so the shifted tabs are
  // already at their final layout slots and must reset their transform WITHOUT animating (else they
  // slide from the now-stale shift offset back to zero).
  const [snapping, setSnapping] = useState(false);
  // Tab edges/centers (viewport x) captured at drag start. Snapshotting is essential: the dragged
  // tab carries a live translateX, so re-measuring mid-drag would read its already-shifted rect and
  // feed back into the clamp (locking it up). Rects (not offsetLeft) because offsetLeft is relative
  // to the nearest positioned ancestor — the strip isn't one, so it'd include the sidebar width.
  const geomRef = useRef<TabGeom[] | null>(null);

  const bind = useDrag(
    ({ args: [index], movement: [mx], first, last }) => {
      if (first) {
        // Grabbing a tab activates it (browser behavior) and snapshots the resting layout.
        selectTab(tabs[index].id);
        const strip = stripRef.current;
        const items = strip
          ? Array.from(strip.querySelectorAll<HTMLElement>(".TabItem"))
          : [];
        geomRef.current =
          items.length === tabs.length
            ? items.map((el) => {
                const r = el.getBoundingClientRect();
                return {
                  left: r.left,
                  right: r.right,
                  center: r.left + r.width / 2,
                  width: r.width,
                };
              })
            : null;
      }
      // Enter the drag only once the pointer has actually travelled past the threshold. Below it
      // nothing moves, so a plain click never lifts the tab into a drag — onClick still selects it.
      // We gate on the real movement here rather than on use-gesture's own `threshold`/`filterTaps`,
      // because on the very first gesture after launch those aren't enforced yet and the handler
      // would otherwise fire on the initial press and lift the tab on a single click.
      const moved = Math.abs(mx) > TAB_DRAG_THRESHOLD_PX;
      if (last) {
        if (moved) {
          reorderTab(index, dropIndex(geomRef.current, index, mx));
          setSnapping(true);
        }
        geomRef.current = null;
        setDrag(null);
      } else if (moved) {
        const dx = clampDx(geomRef.current, index, mx);
        setDrag({ index, dx, mx, geom: geomRef.current });
      }
    },
    // filterTaps keeps a plain click firing onClick (select) instead of a 0px drag; keys:false
    // disables @use-gesture's arrow-key dragging on the focused tab. The click/drag split itself is
    // enforced by the movement gate above (TAB_DRAG_THRESHOLD_PX).
    { axis: "x", filterTaps: true, pointer: { keys: false } },
  );

  // Re-enable transitions the frame after a drop, once the no-transition commit has painted.
  useEffect(() => {
    if (!snapping) return;
    const id = requestAnimationFrame(() => setSnapping(false));
    return () => cancelAnimationFrame(id);
  }, [snapping]);

  // Live target slot for the in-progress drag, plus the gap the lifted tab leaves behind (its own
  // width + the inter-tab gap). Recomputed every render as the drag offset changes.
  const geom = drag?.geom ?? null;
  const target = drag ? dropIndex(geom, drag.index, drag.mx) : null;
  const gap = geom && geom.length > 1 ? geom[1].left - geom[0].right : 0;
  const shift = drag && geom ? geom[drag.index].width + gap : 0;

  // Each tab's live x-shift: the dragged one follows the pointer; tabs between its origin and the
  // target slide by `shift` to open the gap (left when dragging right, right when dragging left).
  const translateFor = (index: number): number => {
    if (!drag || target === null) return 0;
    const from = drag.index;
    if (index === from) return drag.dx;
    if (target > from && index > from && index <= target) return -shift;
    if (target < from && index >= target && index < from) return shift;
    return 0;
  };

  return (
    <div
      className={classNames("TabBar", snapping && "snapping")}
      role="tablist"
    >
      <div className="tab_strip" ref={stripRef}>
        {tabs.map((tab, index) => (
          <TabItem
            key={tab.id}
            tab={tab}
            active={tab.id === activeTabId}
            closable={closable}
            closeHotkey={closeHotkey}
            onSelect={selectTab}
            onClose={closeTab}
            bindProps={bind(index)}
            dragging={drag?.index === index}
            translate={translateFor(index)}
          />
        ))}
      </div>
      <IconButton
        className="tab_new"
        icon={faPlus}
        size={ICON_BUTTON_SIZE.SM}
        variant={ICON_BUTTON_VARIANT.GHOST}
        tooltip={t.tabs.newTab}
        hotkey={newTabHotkey}
        aria-label={t.tabs.newTab}
        onClick={() => newTab()}
      />
    </div>
  );
};

export default TabBar;
