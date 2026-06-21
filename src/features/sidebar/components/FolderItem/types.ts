import type { Pinned } from "../../types";

export type FolderItemProps = {
  item: Pinned;
  setPath: (path: string) => void;
  collapsed: boolean;
};
