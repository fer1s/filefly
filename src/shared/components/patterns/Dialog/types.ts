import type { ReactNode } from "react";

export type DialogProps = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
};
