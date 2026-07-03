import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  faMagnifyingGlass,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

import Icon from "@/shared/components/elements/Icon";
import { useRecentSearches } from "@/shared/search/recentSearches";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/PathSearch.css";

import { RECENTS_GAP } from "./constants";
import type { DropdownCoords, PathSearchProps } from "./types";

// Inline folder filter, expanded from the PathBar's search button (which it replaces while open).
// Bound to the per-tab `search` state. Focusing the empty field shows a small recent-searches
// dropdown (portaled so the box's overflow:hidden, used by the open/close animation, can't clip
// it). Escape closes; an empty blur closes too. Animates in on mount and out via `closing`.
const PathSearch = ({
  value,
  onChange,
  onClose,
  closing,
  onExited,
}: PathSearchProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [opened, setOpened] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords | null>(null);

  const { recents, clearRecents } = useRecentSearches();
  // Gate on `opened` so recents appear only after the open animation finishes — while the box is
  // still growing (max-width 0→full), the tracked dropdown would fly across from the button spot.
  const showRecents =
    focused && opened && !value && !closing && recents.length > 0;

  useEffect(() => inputRef.current?.focus(), []);

  // Measure and position the dropdown under the box when it opens (portal renders only while
  // showRecents, so stale coords while hidden are harmless — no need to reset them). Focus fires
  // on mount while the box is still animating open (max-width 0→full), so a one-shot measure would
  // capture the collapsed width/position; re-measure via ResizeObserver as it grows, and on
  // scroll/resize, so the dropdown tracks the box's final rect.
  useLayoutEffect(() => {
    if (!showRecents) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setCoords({
        top: rect.bottom + RECENTS_GAP,
        left: rect.left,
        width: rect.width,
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [showRecents]);

  // Fill the field from a recent search; keep focus so the search runs immediately.
  const selectRecent = (query: string) => {
    onChange(query);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={classNames("PathSearch", "shadow", closing && "closing")}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        if (closing) onExited();
        else setOpened(true);
      }}
    >
      <Icon className="path_search_icon" icon={faMagnifyingGlass} />
      <input
        ref={inputRef}
        type="text"
        className="path_search_input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (!value) onClose();
        }}
        placeholder={t.pathbar.searchPlaceholder}
      />

      {showRecents &&
        coords &&
        createPortal(
          <div
            className="path_recents shadow"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
          >
            <div className="path_recents_header">
              <span>{t.pathbar.recentSearches}</span>
              {/* preventDefault on mousedown so clicking doesn't blur (and close) the field. */}
              <button
                type="button"
                className="path_recents_clear"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearRecents}
              >
                {t.pathbar.clearRecents}
              </button>
            </div>
            {recents.map((query) => (
              <button
                key={query}
                type="button"
                className="path_recents_item"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectRecent(query)}
              >
                <Icon icon={faClockRotateLeft} />
                <span>{query}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default PathSearch;
