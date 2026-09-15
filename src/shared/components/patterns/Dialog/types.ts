import type { ReactNode } from "react";

export type DialogProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};
