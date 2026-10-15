import { useEffect, useRef } from "react";

import { KEY, VIEW_MODE } from "@/shared/constants";
import {
  useTypeahead,
  findTypeaheadMatch,
  typeaheadStartIndex,
} from "@/shared/hooks/useTypeahead";

import type { UseKeyboardNavArgs } from "./types";

// Keyboard navigation over the visible entries: arrows move a cursor (and select it), Enter opens,
// Escape clears, and printable characters drive type-to-find. Disabled while `enabled` is false.
export const useKeyboardNav = ({
  items,
  view,
  enabled,
  selectedIDs,
  setSelectedIDs,
  onOpen,
  onTypeaheadChange,
}: UseKeyboardNavArgs) => {
  // Type-to-find buffer/timer; this hook only maps its queries onto the entry selection.
  const {
    push: pushTypeahead,
    backspace: popTypeahead,
    clear: clearTypeahead,
    isActive: typeaheadActive,
  } = useTypeahead({ onChange: onTypeaheadChange });

  // Latest selection, read inside the keydown handler without re-subscribing on every change.
  const selectedRef = useRef(selectedIDs);
  // Anchor for Shift+Arrow range selection: the fixed end of the range. It tracks the last
  // single selection (plain arrow / click / type-to-find), so a click then Shift+Arrow extends
  // from the clicked item. Left untouched while a multi-selection is active.
  const anchorRef = useRef<string | null>(null);
  useEffect(() => {
    selectedRef.current = selectedIDs;
    if (selectedIDs.length <= 1) anchorRef.current = selectedIDs[0] ?? null;
  }, [selectedIDs]);

  useEffect(() => {
    // Text fields and overlays own their keyboard events; directory navigation must stay behind.
    const shouldIgnoreTarget = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      return (
        !!t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable ||
          t.closest('[role="menu"]') !== null)
      );
    };

    // Number of items in the first grid row, used as the vertical step.
    const columns = () => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".directory_page .grid .dir_entry_item",
        ),
      );
      if (!els.length) return 1;
      const top = els[0].offsetTop;
      let cols = 0;
      for (const el of els) {
        if (el.offsetTop === top) cols++;
        else break;
      }
      return cols || 1;
    };

    const indexOf = (path: string) => items.findIndex((e) => e.path === path);
    const clampIndex = (i: number) =>
      Math.max(0, Math.min(items.length - 1, i));

    // Move the cursor by delta relative to the last selected entry and select that single entry.
    const move = (delta: number) =>
      setSelectedIDs((prev) => {
        if (!items.length) return prev;
        const current = prev.length ? indexOf(prev[prev.length - 1]) : -1;
        const next = clampIndex(current < 0 ? 0 : current + delta);
        return [items[next].path];
      });

    // Extend the selection by delta: keep the anchor fixed, move the cursor, and select the whole
    // contiguous range between them (the cursor end stays last so further moves read it back).
    const extend = (delta: number) => {
      if (!items.length) return;
      const sel = selectedRef.current;
      const anchorPath =
        anchorRef.current ?? sel[sel.length - 1] ?? items[0].path;
      const anchorIndex = Math.max(0, indexOf(anchorPath));
      const cursorPath = sel[sel.length - 1] ?? anchorPath;
      const cursorIndex = indexOf(cursorPath);
      const nextCursor = clampIndex(
        (cursorIndex < 0 ? anchorIndex : cursorIndex) + delta,
      );

      const range: string[] = [];
      const step = anchorIndex <= nextCursor ? 1 : -1;
      for (let i = anchorIndex; ; i += step) {
        range.push(items[i].path);
        if (i === nextCursor) break;
      }

      anchorRef.current = anchorPath;
      setSelectedIDs(range);
      // The cursor isn't focused during a multi-selection, so scroll it into view ourselves.
      document
        .getElementById(items[nextCursor].path)
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };

    // Open the last selected entry.
    const open = () =>
      setSelectedIDs((prev) => {
        const entry = prev.length
          ? items.find((e) => e.path === prev[prev.length - 1])
          : undefined;
        if (entry) onOpen(entry);
        return prev;
      });

    // Type-to-find: a single-char query starts after the current entry so repeated presses cycle
    // through matches; longer queries match from the top.
    const typeahead = (char: string) => {
      const query = pushTypeahead(char);
      setSelectedIDs((prev) => {
        if (!items.length) return prev;
        const current = prev.length ? indexOf(prev[prev.length - 1]) : -1;
        const match = findTypeaheadMatch(
          items,
          query,
          typeaheadStartIndex(query, current),
        );
        return match ? [match.path] : prev;
      });
    };

    // Backspace while type-to-find is active edits the search (instead of navigating back).
    // Returns whether it consumed the key, so the caller can stop the PathBar's back shortcut.
    // The shortened query re-selects the first entry matching it, searching from the top.
    const backspaceTypeahead = () => {
      const query = popTypeahead();
      if (query === null) return false;
      if (query)
        setSelectedIDs((prev) => {
          const match = findTypeaheadMatch(items, query, 0);
          return match ? [match.path] : prev;
        });
      return true;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnoreTarget(e.target)) return;
      if (!enabled) return;

      // Printable single characters drive the type-to-find search.
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        typeahead(e.key);
        return;
      }

      // Backspace edits an active type-to-find search rather than navigating back. Consuming it
      // (capture phase + stopImmediatePropagation) keeps the PathBar's Backspace=back from firing.
      if (e.key === KEY.BACKSPACE && !e.shiftKey && backspaceTypeahead()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        return;
      }

      // Cursor nav handles unmodified keys (and Shift for range selection); other modified combos
      // (e.g. Alt+Arrow for history navigation) belong to the keymap listeners.
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Shift+Arrow extends the selection as a range; a plain arrow selects a single entry.
      const step = (delta: number) =>
        e.shiftKey ? extend(delta) : move(delta);

      switch (e.key) {
        case KEY.ESCAPE:
          // Deselect first: only consume Escape (and clear) when there's a selection or an
          // active type-to-find. With nothing to clear, let it fall through (e.g. exit
          // fullscreen) — so the first Escape deselects, the next exits fullscreen.
          if (typeaheadActive() || selectedRef.current.length) {
            e.preventDefault();
            clearTypeahead();
            setSelectedIDs([]);
          }
          break;
        case KEY.ARROW_RIGHT:
          e.preventDefault();
          step(1);
          break;
        case KEY.ARROW_LEFT:
          e.preventDefault();
          step(-1);
          break;
        case KEY.ARROW_DOWN:
          e.preventDefault();
          step(view === VIEW_MODE.GRID ? columns() : 1);
          break;
        case KEY.ARROW_UP:
          e.preventDefault();
          step(view === VIEW_MODE.GRID ? -columns() : -1);
          break;
        case KEY.ENTER:
          e.preventDefault();
          open();
          break;
      }
    };

    // Capture phase so this runs before the PathBar's bubble-phase keydown — letting an active
    // type-to-find swallow Backspace (via stopImmediatePropagation) before it navigates back.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      clearTypeahead();
    };
  }, [
    items,
    view,
    enabled,
    setSelectedIDs,
    onOpen,
    pushTypeahead,
    popTypeahead,
    clearTypeahead,
    typeaheadActive,
  ]);
};
