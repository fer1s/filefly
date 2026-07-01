import type { CSSProperties, ReactNode } from "react";

export type SidebarSectionProps = {
  title: string;
  children: ReactNode;
  hideWhenCollapsed?: boolean;
  // Sidebar-wide edit mode. When true the group renders with dashed outlines and (if `onAddItem`
  // is set) shows the "add item" buttons between rows.
  editing?: boolean;
  // Inline style applied to the group root (used to follow the pointer while drag-reordering).
  style?: CSSProperties;
  // True while this group is the one being dragged (drops the drop transition, lifts it visually).
  dragging?: boolean;
  // Drag-handle props (from useDrag). When present a grip handle shows in the header in edit mode.
  dragHandleProps?: Record<string, unknown>;
  // When provided the group title becomes an inline rename input on click (Enter commits,
  // Escape / blur discards). Omit to keep the title read-only (e.g. Volumes).
  onRename?: (name: string) => void;
  // When provided an "add item" button appears between items and at both ends of the list while
  // in edit mode; `index` is the insert position (0 = before the first item, length = after last).
  onAddItem?: (index: number) => void;
  // When provided a delete button shows in the header in edit mode (custom groups only). Deleting
  // a group takes all its items with it, so the caller should confirm first.
  onDelete?: () => void;
};
