import type { ReactNode } from "react";

export interface PreviewControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onDelete: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  children?: ReactNode;
  className?: string;
}
