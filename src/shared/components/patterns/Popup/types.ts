import type { ReactNode } from "react";

export interface PopupProps {
  visible: boolean;
  title: string;
  children: ReactNode;
}
