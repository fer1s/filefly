import type { MouseEvent } from "react";

import type { SidebarPathItem } from "../../types";

export type FolderItemProps = {
  item: SidebarPathItem;
  setPath: (path: string) => void;
  collapsed: boolean;
  active: boolean;
  hotkey?: string;
  onContextMenu?: (e: MouseEvent) => void;
};
