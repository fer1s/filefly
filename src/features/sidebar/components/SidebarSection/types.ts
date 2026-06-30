import type { ReactNode } from "react";

export type SidebarSectionProps = {
  title: string;
  children: ReactNode;
  hideWhenCollapsed?: boolean;
  // Sidebar-wide edit mode. When true the group renders with dashed outlines and (if `onAddItem`
  // is set) shows the "add item" buttons between rows.
  editing?: boolean;
  // When provided the group title becomes an inline rename input on click (Enter commits,
  // Escape / blur discards). Omit to keep the title read-only (e.g. Volumes).
  onRename?: (name: string) => void;
  // When provided an "add item" button appears between items and at both ends of the list while
  // in edit mode; `index` is the insert position (0 = before the first item, length = after last).
  onAddItem?: (index: number) => void;
};
