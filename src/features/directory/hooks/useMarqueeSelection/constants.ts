// Minimum drag distance (px) before a press becomes a marquee instead of a click.
export const DRAG_THRESHOLD = 4;

// Toggled on <body> while a marquee drag is active. Used in CSS to suppress per-entry
// pointer interactions (e.g. the metadata tooltip) without re-rendering the rows.
export const MARQUEE_ACTIVE_CLASS = "is-marqueeing";
