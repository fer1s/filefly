import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  faMagnifyingGlass,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import TextInput from "@/shared/components/elements/TextInput";
import { useRecentSearches } from "@/shared/search/recentSearches";
import { t } from "@/lang";

import "@/styles/components/PathSearch.css";

import { RECENTS_GAP } from "./constants";
import type { DropdownCoords, PathSearchProps } from "./types";

// Persistent per-tab folder filter. The portaled recent-search menu stays outside the shell's
// overflow clipping; focus remains controlled by the existing search shortcut.
const PathSearch = ({
  value,
  onChange,
  inputRef,
  onFocusChange,
}: PathSearchProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [coords, setCoords] = useState<DropdownCoords | null>(null);

  const { recents, clearRecents } = useRecentSearches();
  const showRecents = focused && !value && recents.length > 0;

  // Measure and position the dropdown under the box when it opens (portal renders only while
  // showRecents, so stale coords while hidden are harmless — no need to reset them). Observe
  // resizes so the menu follows the field when neighbouring controls or window size change.
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
    <div ref={containerRef} className="PathSearch shadow">
      <Icon className="path_search_icon" icon={faMagnifyingGlass} />
      <TextInput
        unstyled
        ref={inputRef}
        className="path_search_input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocusChange(true);
        }}
        onBlur={() => {
          setFocused(false);
          onFocusChange(false);
        }}
        placeholder={t.pathbar.searchPlaceholder}
        aria-label={t.pathbar.search}
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
              <Button
                unstyled
                className="path_recents_clear"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearRecents}
              >
                {t.pathbar.clearRecents}
              </Button>
            </div>
            {recents.map((query) => (
              <Button
                key={query}
                unstyled
                className="path_recents_item"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectRecent(query)}
              >
                <Icon icon={faClockRotateLeft} />
                <span>{query}</span>
              </Button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default PathSearch;
