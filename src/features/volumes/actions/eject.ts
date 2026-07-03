import { faEject } from "@fortawesome/free-solid-svg-icons";

import { ejectVolume } from "@/shared/services/ejectVolume";
import { t } from "@/lang";

import { VOLUME_ACTION } from "./constants";
import type { VolumeAction } from "./types";

// Eject an ejectable volume, then refresh the list so the device disappears. Only shown for
// ejectable volumes (removable media or anything mounted under /Volumes).
export const ejectAction: VolumeAction = {
  id: VOLUME_ACTION.EJECT,
  label: () => t.contextMenu.eject,
  icon: faEject,
  isVisible: (ctx) => ctx.isEjectable,
  run: async ({ fs, path, refreshVolumes, onClose }) => {
    onClose();
    await ejectVolume(fs, path, refreshVolumes);
  },
};
