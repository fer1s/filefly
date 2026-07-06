import type { MouseEvent } from "react";

import type { SidebarPathItem } from "../../types";

export type FolderItemProps = {
  item: SidebarPathItem;
  setPath: (path: string) => void;
  collapsed: boolean;
  active: boolean;
  hotkey?: string;
  onContextMenu?: (e: MouseEvent) => void;
  // When provided (edit mode, custom items only) a trash button shows to remove the item.
  onRemove?: () => void;
  // When provided (edit mode, preset rows only) an eye button toggles the preset's visibility
  // instead of a trash button — presets are hidden, never deleted.
  onToggleHidden?: () => void;
  // Whether this preset is currently hidden (only meaningful with onToggleHidden). Drives the
  // eye/eye-slash icon and dims the row so it's clearly "off" while still editable.
  hidden?: boolean;
  // Extra class on the row (e.g. a tag colour modifier that tints the icon).
  className?: string;
};
