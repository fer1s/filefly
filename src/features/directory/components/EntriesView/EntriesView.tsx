import { useEffect, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { t } from "@/lang";
import { DirEntryItem } from "../DirEntry";

import { RENDER_BATCH_SIZE, RENDER_PREFETCH_PX } from "./constants";
import type { EntriesViewProps } from "./types";

// Renders the entries grid/list. The container owns selection, rename and the context-menu
// state; this component just wires each entry row to it.
//
// Large directories are rendered in batches: only the first RENDER_BATCH_SIZE entries mount,
// then a sentinel near the bottom grows the slice as the user scrolls. Rendering thousands of
// rows (each with its own effects) at once would otherwise freeze the UI. The component is
// remounted per folder (keyed by path in Directory), so the slice resets on navigation.
const EntriesView = ({
  entries,
  view,
  selectedIDs,
  cutPaths,
  renamingID,
  contextMenuRef,
  onSelect,
  onRename,
  onCancelRename,
  menu,
}: EntriesViewProps) => {
  const { fs, setPath, dateFormat } = useStateContext();
  const [renderCount, setRenderCount] = useState(RENDER_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = renderCount < entries.length;

  // Grow the rendered slice whenever the sentinel comes near the viewport. Re-fires as the
  // sentinel moves down after each batch, so it fills the viewport then waits for scrolling.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (observed) => {
        if (observed.some((entry) => entry.isIntersecting))
          setRenderCount((count) =>
            Math.min(count + RENDER_BATCH_SIZE, entries.length),
          );
      },
      { rootMargin: `${RENDER_PREFETCH_PX}px` },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [entries.length]);

  // Exactly one entry is focused when there's a single selection; that one is the Tab stop,
  // otherwise the first entry is, so the grid always has one reachable tabindex (roving).
  const hasFocused = selectedIDs.length === 1;

  return (
    <div
      className={view}
      role="listbox"
      aria-multiselectable="true"
      aria-label={t.directory.entriesLabel}
    >
      {entries.slice(0, renderCount).map((entry, index) => {
        const focused = hasFocused && selectedIDs[0] === entry.path;
        return (
          <DirEntryItem
            key={`${entry.name}#${entry.path}`}
            entry={entry}
            fs={fs}
            setPath={setPath}
            dateFormat={dateFormat}
            contextMenuRef={contextMenuRef}
            id={entry.path}
            selected={selectedIDs.includes(entry.path)}
            cut={cutPaths.has(entry.path)}
            focused={focused}
            tabbable={focused || (!hasFocused && index === 0)}
            onSelect={onSelect}
            renaming={renamingID === entry.path}
            onRename={onRename}
            onCancelRename={onCancelRename}
            setContextMenuVisible={menu.setVisible}
            setContextMenuElementID={menu.setId}
            setContextMenuElementType={menu.setType}
          />
        );
      })}
      {hasMore && <div ref={sentinelRef} className="entries_sentinel" />}
    </div>
  );
};

export default EntriesView;
