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
}
