import type { MouseEvent } from "react";

import { Volume } from "@/shared/models";

export type VolumeItemProps = {
  volume: Volume;
  setPath: (path: string) => void;
  index: number;
  collapsed: boolean;
  active: boolean;
  onContextMenu?: (e: MouseEvent) => void;
};
