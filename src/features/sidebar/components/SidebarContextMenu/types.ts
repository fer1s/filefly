import type { RefObject } from "react";

import type { SidebarMenuTarget } from "../../hooks/useSidebarContextMenu";

export type SidebarContextMenuProps = {
  contextMenuRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
  target: SidebarMenuTarget | null;
  onClose: () => void;
  openProperties: (path: string) => void | Promise<void>;
  editConnection: (path: string) => void;
  removeConnection: (path: string) => void;
};
