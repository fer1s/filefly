// Image-preview zoom bounds and wheel sensitivity (scale per wheel delta unit).
export const IMAGE_ZOOM_MIN = 1;
export const IMAGE_ZOOM_MAX = 5;
// Scale change per wheel delta unit, and per +/- button click.
export const IMAGE_ZOOM_STEP = 0.0015;
export const IMAGE_ZOOM_BUTTON_STEP = 0.5;

// The two modes of the built-in markdown viewer: rendered preview vs. raw source editor.
export const MARKDOWN_MODE = {
  PREVIEW: "preview",
  EDIT: "edit",
} as const;

export type MarkdownMode = (typeof MARKDOWN_MODE)[keyof typeof MARKDOWN_MODE];
