import { faEject } from "@fortawesome/free-solid-svg-icons";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import { VOLUME_ACTION } from "./constants";
import type { VolumeAction } from "./types";

// Eject a removable volume, then refresh the list so the device disappears. Only shown for
// removable volumes.
export const ejectAction: VolumeAction = {
  id: VOLUME_ACTION.EJECT,
  label: () => t.contextMenu.eject,
  icon: faEject,
  isVisible: (ctx) => ctx.isRemovable,
  run: async ({ fs, path, name, refreshVolumes, onClose }) => {
    onClose();
    try {
      await fs.ejectVolume(path);
      notify(t.volumes.ejected(name), TOAST_TYPE.SUCCESS);
      refreshVolumes();
    } catch (error) {
      notify(t.errors.eject(String(error)), TOAST_TYPE.ERROR);
    }
  },
};
