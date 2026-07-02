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
  // (e.g. dragging a wide tab onto a narrower last tab still reaches the final slot).
  const [drag, setDrag] = useState<{
    index: number;
    dx: number;
    mx: number;
  } | null>(null);
  // True for the single frame after a drop: the reorder just committed, so the shifted tabs are
  // already at their final layout slots and must reset their transform WITHOUT animating (else they
  // slide from the now-stale shift offset back to zero).
  const [snapping, setSnapping] = useState(false);
  // Tab edges/centers (viewport x) captured at drag start. Snapshotting is essential: the dragged
  // tab carries a live translateX, so re-measuring mid-drag would read its already-shifted rect and
  // feed back into the clamp (locking it up). Rects (not offsetLeft) because offsetLeft is relative
  // to the nearest positioned ancestor — the strip isn't one, so it'd include the sidebar width.
  const geomRef = useRef<
    { left: number; right: number; center: number; width: number }[] | null
  >(null);

  // Clamp the raw pointer offset so the dragged tab can't leave the strip — its left edge stops at
  // the strip's left and its right edge at the last tab's end (so it never overlaps the "+" or
  // slides under the sidebar).
  const clampDx = (index: number, mx: number): number => {
    const geom = geomRef.current;
    if (!geom) return mx;
    const el = geom[index];
    const minDx = geom[0].left - el.left;
    const maxDx = geom[geom.length - 1].right - el.right;
    return Math.max(minDx, Math.min(maxDx, mx));
  };

  // Where the dragged tab should land: the count of other tabs whose center sits left of the
  // pointer-projected center. Uses the RAW offset (not clamped) so a wide tab can still reach a
  // slot occupied by a narrower tab. That count is exactly the splice index.
  const dropIndex = (index: number, mx: number): number => {
    const geom = geomRef.current;
    if (!geom) return index;
    const draggedCenter = geom[index].center + mx;
    let target = 0;
    geom.forEach((g, i) => {
      if (i !== index && g.center < draggedCenter) target += 1;
    });
    return target;
  };

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
      const dx = clampDx(index, mx);
      if (last) {
        reorderTab(index, dropIndex(index, mx));
        geomRef.current = null;
        setDrag(null);
        setSnapping(true);
      } else {
        setDrag({ index, dx, mx });
      }
    },
    // filterTaps keeps a plain click firing onClick (select) instead of being read as a 0px drag.
    { axis: "x", filterTaps: true },
  );

  // Re-enable transitions the frame after a drop, once the no-transition commit has painted.
  useEffect(() => {
    if (!snapping) return;
    const id = requestAnimationFrame(() => setSnapping(false));
    return () => cancelAnimationFrame(id);
  }, [snapping]);

  // Live target slot for the in-progress drag, plus the gap the lifted tab leaves behind (its own
  // width + the inter-tab gap). Recomputed every render as the drag offset changes.
  const geom = geomRef.current;
  const target = drag ? dropIndex(drag.index, drag.mx) : null;
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
    <div className={classNames("TabBar", snapping && "snapping")} role="tablist">
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
