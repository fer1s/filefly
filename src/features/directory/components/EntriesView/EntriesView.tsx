import { useEffect, useMemo, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { t } from "@/lang";
import { useTags } from "@/shared/providers/TagsProvider";
import { DirEntryItem } from "../DirEntry";

import { NO_TAGS, RENDER_BATCH_SIZE, RENDER_PREFETCH_PX } from "./constants";
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
  onOpenFile,
  onRename,
  onCancelRename,
  menu,
  bindDrag,
  metadataTooltipDisabled,
  revealID,
  clearRevealID,
}: EntriesViewProps) => {
  const { fs, setPath, dateFormat, remoteThumbnails } = useStateContext();
  const { tags: tagsByPath, loadTags } = useTags();
  const [renderCount, setRenderCount] = useState(RENDER_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = renderCount < entries.length;

  // Scroll a revealed entry into view. If it sits past the current render batch, grow the slice to
  // include it first (this effect re-runs once it's mounted), then scroll and clear the request.
  useEffect(() => {
    if (!revealID) return;
    const index = entries.findIndex((entry) => entry.path === revealID);
    if (index === -1) {
      clearRevealID(); // not in this folder (e.g. wrong window) — drop the request
      return;
    }
    if (index >= renderCount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRenderCount((count) => Math.max(count, index + 1));
      return;
    }
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(revealID)
        ?.scrollIntoView({ block: "center", inline: "nearest" });
      clearRevealID();
    });
    return () => cancelAnimationFrame(raf);
  }, [revealID, entries, renderCount, clearRevealID]);

  // Finder tags for the rows currently rendered (lazy — grows with the slice, never reads twice).
  const renderedPaths = useMemo(
    () => entries.slice(0, renderCount).map((entry) => entry.path),
    [entries, renderCount],
  );
  useEffect(() => {
    void loadTags(renderedPaths);
  }, [loadTags, renderedPaths]);

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
            tags={tagsByPath[entry.path] ?? NO_TAGS}
            dateFormat={dateFormat}
            contextMenuRef={contextMenuRef}
            id={entry.path}
            selected={selectedIDs.includes(entry.path)}
            cut={cutPaths.has(entry.path)}
            focused={focused}
            tabbable={focused || (!hasFocused && index === 0)}
            onSelect={onSelect}
            onOpenFile={onOpenFile}
            renaming={renamingID === entry.path}
            onRename={onRename}
            onCancelRename={onCancelRename}
            setContextMenuVisible={menu.setVisible}
            setContextMenuElementID={menu.setId}
            setContextMenuElementType={menu.setType}
            bindDrag={bindDrag}
            metadataTooltipDisabled={metadataTooltipDisabled}
            remoteThumbnails={remoteThumbnails}
          />
        );
      })}
      {hasMore && <div ref={sentinelRef} className="entries_sentinel" />}
    </div>
  );
};

export default EntriesView;
