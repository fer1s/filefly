import { useContextMenuState } from "@/shared/hooks/useContextMenuState";

import type { SidebarItemKind } from "../../constants";

// The sidebar row a menu is open for. `isRemovable` only matters for volume rows (drives Eject).
export type SidebarMenuTarget = {
  path: string;
  kind: SidebarItemKind;
  isRemovable?: boolean;
};

// Sidebar context-menu state: the generic menu-state hook carrying a sidebar item (path + kind).
// `target` is the generic payload, named for the sidebar's use.
export const useSidebarContextMenu = () => {
  const { ref, visible, payload, openAt, close } =
    useContextMenuState<SidebarMenuTarget>();
  return { ref, visible, target: payload, openAt, close };
};
