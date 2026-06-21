import type { SidebarPathItem } from "../../types";

export type FolderItemProps = {
  item: SidebarPathItem;
  setPath: (path: string) => void;
  collapsed: boolean;
};
