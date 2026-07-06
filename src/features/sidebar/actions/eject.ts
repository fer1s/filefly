import { faEject } from "@fortawesome/free-solid-svg-icons";

import { ejectVolume } from "@/shared/services/ejectVolume";
import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Eject an ejectable volume, then refresh the list. Only shown for ejectable volumes (removable
// media or anything mounted under /Volumes — external disks, disk images, extra partitions).
export const ejectAction: SidebarAction = {
  id: SIDEBAR_ACTION.EJECT,
  label: () => t.contextMenu.eject,
  icon: faEject,
  isVisible: (ctx) => ctx.isEjectable,
  run: async ({ fs, path, refreshVolumes, onClose }) => {
    onClose();
    await ejectVolume(fs, path, refreshVolumes);
  },
};
