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
