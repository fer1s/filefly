import type { MouseEvent } from "react";

export interface PreviewProps {
  fileType: string;
  filePath: string;

  previewVisible: boolean;
  setPreviewVisible: (visible: boolean) => void;

  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
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
