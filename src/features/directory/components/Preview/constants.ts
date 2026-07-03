import type { ResizeDir } from "./types";

// Image-preview zoom bounds and wheel sensitivity (scale per wheel delta unit).
export const IMAGE_ZOOM_MIN = 1;
export const IMAGE_ZOOM_MAX = 5;
// Scale change per wheel delta unit, and per +/- button click.
export const IMAGE_ZOOM_STEP = 0.0015;
export const IMAGE_ZOOM_BUTTON_STEP = 0.5;

// Centered pan (no offset) — the reset value whenever zoom returns to 1x.
export const NO_PAN = { x: 0, y: 0 };

// The two modes of the built-in markdown viewer: rendered preview vs. raw source editor.
export const MARKDOWN_MODE = {
  PREVIEW: "preview",
  EDIT: "edit",
} as const;

export type MarkdownMode = (typeof MARKDOWN_MODE)[keyof typeof MARKDOWN_MODE];

// Floating-panel sizing. PANEL_MARGIN is the inset kept between the panel and the viewport edges
// (matches the old --space-10 margin) and the gap left around a maximized panel so it stays inside
// the screen. PANEL_MIN_W/H are the smallest the resize handles allow.
export const PANEL_MARGIN = 40;
export const PANEL_MIN_W = 320;
export const PANEL_MIN_H = 220;

// The 8 resize handles (4 edges + 4 corners): CSS modifier class + the edges each one drives.
export const RESIZE_HANDLES: { cls: string; dir: ResizeDir }[] = [
  { cls: "n", dir: { t: true } },
  { cls: "s", dir: { b: true } },
  { cls: "e", dir: { r: true } },
  { cls: "w", dir: { l: true } },
  { cls: "ne", dir: { t: true, r: true } },
  { cls: "nw", dir: { t: true, l: true } },
  { cls: "se", dir: { b: true, r: true } },
  { cls: "sw", dir: { b: true, l: true } },
];
