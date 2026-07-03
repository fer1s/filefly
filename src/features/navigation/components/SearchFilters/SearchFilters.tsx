import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { faFilter } from "@fortawesome/free-solid-svg-icons";

import IconButton, {
  ICON_BUTTON_VARIANT,
  ICON_BUTTON_SIZE,
} from "@/shared/components/elements/IconButton";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { classNames } from "@/shared/utils";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  type FileKind,
} from "@/shared/search/filters";
import { t } from "@/lang";

import { KIND_ORDER, DATE_ORDER, SIZE_ORDER, PANEL_GAP } from "./constants";

import "@/styles/components/SearchFilters.css";

// Filter control for the current search: a boxed button (badged with the active-filter count) that
// opens a panel to narrow results by kind, modified date, size, and scope. Reads/writes the per-tab
// `filters` from context. Rendered by the PathBar only while a search is active.
const SearchFilters = () => {
  const { filters, setFilters } = useStateContext();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );

  const count = activeFilterCount(filters);

  useCloseOnEscape(open, () => setOpen(false));

  // Position the panel under the button, right-aligned to it (the button sits near the bar's end).
  useLayoutEffect(() => {
    if (!open) return;
    const rect = anchorRef.current?.getBoundingClientRect();
    if (rect)
      setCoords({
        top: rect.bottom + PANEL_GAP,
        right: window.innerWidth - rect.right,
      });
  }, [open]);

  // Close on a click/tap outside the button or the panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !anchorRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const toggleKind = (kind: FileKind) =>
    setFilters({
      ...filters,
      kinds: filters.kinds.includes(kind)
        ? filters.kinds.filter((k) => k !== kind)
        : [...filters.kinds, kind],
    });

  return (
    <div ref={anchorRef} className="SearchFilters">
      <IconButton
        icon={faFilter}
        onClick={() => setOpen((v) => !v)}
        variant={ICON_BUTTON_VARIANT.BOXED}
        size={ICON_BUTTON_SIZE.LG}
        tooltip={t.filters.tooltip}
        aria-label={t.filters.tooltip}
        className={classNames("shadow", "filters_toggle", open && "active")}
      />
      {count > 0 && <span className="filters_badge">{count}</span>}

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            className="search_filters_panel shadow"
            style={{ top: coords.top, right: coords.right }}
          >
            <div className="filters_panel_head">
              <span className="filters_panel_title">{t.filters.title}</span>
              {count > 0 && (
                <button
                  type="button"
                  className="filters_clear"
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                >
                  {t.filters.clear}
                </button>
              )}
            </div>

            <div className="filters_group">
              <span className="filters_label">{t.filters.kind}</span>
              <div className="filters_chips">
                {KIND_ORDER.map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={classNames(
                      "filters_chip",
                      filters.kinds.includes(kind) && "on",
                    )}
                    onClick={() => toggleKind(kind)}
                  >
                    {t.filters.kinds[kind]}
                  </button>
                ))}
              </div>
            </div>

            <div className="filters_group">
              <span className="filters_label">{t.filters.date}</span>
              <div className="filters_chips">
                {DATE_ORDER.map((range) => (
                  <button
                    key={range}
                    type="button"
                    className={classNames(
                      "filters_chip",
                      filters.date === range && "on",
                    )}
                    onClick={() => setFilters({ ...filters, date: range })}
                  >
                    {t.filters.dates[range]}
                  </button>
                ))}
              </div>
            </div>

            <div className="filters_group">
              <span className="filters_label">{t.filters.size}</span>
              <div className="filters_chips">
                {SIZE_ORDER.map((bucket) => (
                  <button
                    key={bucket}
                    type="button"
                    className={classNames(
                      "filters_chip",
                      filters.size === bucket && "on",
                    )}
                    onClick={() => setFilters({ ...filters, size: bucket })}
                  >
                    {t.filters.sizes[bucket]}
                  </button>
                ))}
              </div>
            </div>

            <label className="filters_scope">
              <input
                type="checkbox"
                checked={filters.currentFolderOnly}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    currentFolderOnly: e.target.checked,
                  })
                }
              />
              {t.filters.currentFolderOnly}
            </label>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default SearchFilters;
