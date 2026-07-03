import type { MouseEvent } from "react";

import { Volume } from "@/shared/models";

export type VolumeItemProps = {
  volume: Volume;
  setPath: (path: string) => void;
  index: number;
  collapsed: boolean;
  active: boolean;
  onContextMenu?: (e: MouseEvent) => void;
  // Eject this volume. Provided only for ejectable volumes (and only when expanded), which is what
  // renders the inline eject button.
  onEject?: () => void;
};
