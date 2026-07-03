import { useContextMenuState } from "@/shared/hooks/useContextMenuState";

import type { SidebarMenuTarget } from "./types";

// Sidebar context-menu state: the generic menu-state hook carrying a sidebar item (path + kind).
// `target` is the generic payload, named for the sidebar's use.
export const useSidebarContextMenu = () => {
  const { ref, visible, payload, openAt, close } =
    useContextMenuState<SidebarMenuTarget>();
  return { ref, visible, target: payload, openAt, close };
};
