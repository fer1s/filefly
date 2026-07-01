import type { RefObject } from "react";

import type { Volume } from "@/shared/models";

export type VolumeContextMenuProps = {
  contextMenuRef: RefObject<HTMLDivElement | null>;
  visible: boolean;
  // The clicked volume, or null when the menu has never opened.
  volume: Volume | null;
  onClose: () => void;
  openProperties: (path: string) => void | Promise<void>;
};
