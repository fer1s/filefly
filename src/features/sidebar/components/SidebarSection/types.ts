import type { ReactNode } from "react";

export type SidebarSectionProps = {
  title: string;
  children: ReactNode;
  hideWhenCollapsed?: boolean;
};
