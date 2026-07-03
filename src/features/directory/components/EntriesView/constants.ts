import type { Tag } from "@/shared/models";

// Stable reference for untagged rows so DirEntryItem's memo isn't broken by a fresh [] each render.
export const NO_TAGS: Tag[] = [];

// How many entries to add per batch while scrolling (and the initial count). Large directories
// render this many at a time instead of all at once, which would freeze the UI.
export const RENDER_BATCH_SIZE = 80;

// Start growing the rendered slice this far before the sentinel reaches the viewport, so new
// rows are ready before they're scrolled into view.
export const RENDER_PREFETCH_PX = 800;
