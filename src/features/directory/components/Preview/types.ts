import type { MouseEvent, KeyboardEvent, RefObject } from "react";
import type { useDrag } from "@use-gesture/react";

// Floating-panel geometry (px, viewport coords). The panel is position:fixed and driven entirely by
// this — drag moves left/top, the resize handles change size, maximize fills the viewport.
export type Geom = { left: number; top: number; width: number; height: number };

// Which edges a resize handle drives.
export type ResizeDir = { l?: boolean; r?: boolean; t?: boolean; b?: boolean };

// A loaded markdown document: raw `source` (last saved on disk), the editable `draft`, and the
// rendered `html` of the draft shown in preview mode.
export type MarkdownDoc = {
  path: string;
  source: string;
  draft: string;
  html: string;
};

export interface PreviewFindBarProps {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  matchCount: number;
  matchIndex: number;
  onQueryChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export interface PreviewResizeHandlesProps {
  bind: ReturnType<typeof useDrag>;
}

export interface PreviewProps {
  fileType: string;
  filePath: string;

  previewVisible: boolean;
  setPreviewVisible: (visible: boolean) => void;

  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;

  // Trash the file currently being previewed (with confirmation). The preview then advances to the
  // next file, or closes when none remain — handled by usePreview reacting to the shrunk list.
  onDelete: () => void;

  // Render as the whole content of a dedicated window (see PreviewWindow) rather than a floating
  // in-app panel: the native window frame is the chrome, so drop the backdrop, the custom draggable
  // header and the resize handles, and fill the window opaquely. Defaults to false (in-app overlay).
  windowed?: boolean;
}

export interface ZoomableImageProps {
  src: string;
  alt: string;
  onContextMenu: (e: MouseEvent) => void;
  // Controlled zoom + pan (lifted to Preview so the zoom control can sit in the shared bottom
  // bar). The image applies the transform; wheel reports zoom via onZoomTo and drag reports pan
  // via onPanChange.
  zoom: number;
  pan: { x: number; y: number };
  onZoomTo: (value: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
}
