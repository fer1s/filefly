import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

import type { VolumeActionId } from "./constants";

// Everything a volume action needs to run, resolved by the menu at click time. `path` is the
// clicked volume's mount point.
export type VolumeActionContext = {
  path: string;
  name: string;
  isEjectable: boolean;
  fs: FileSystemManager;
  setPath: (path: string) => void;
  openInNewTab: (path: string) => void;
  openProperties: (path: string) => void | Promise<void>;
  // Re-list the volumes (used after ejecting, so the removed device disappears).
  refreshVolumes: () => void;
  onClose: () => void;
};

// A predefined, reusable volumes context-menu action. Presentation (label/icon) is declared
// statically; behavior lives in `run`.
export type VolumeAction = {
  id: VolumeActionId;
  // Lazy so it always reads the current language dictionary.
  label: () => string;
  icon: IconDefinition;
  // Whether the action applies in the given context (e.g. Eject only for removable volumes).
  // Absent means always shown.
  isVisible?: (ctx: VolumeActionContext) => boolean;
  run: (ctx: VolumeActionContext) => void | Promise<void>;
};
