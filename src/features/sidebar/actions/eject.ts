import { faEject } from "@fortawesome/free-solid-svg-icons";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { basename } from "@/shared/utils";
import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Eject a removable volume, then refresh the list. Only shown for removable volumes.
export const ejectAction: SidebarAction = {
  id: SIDEBAR_ACTION.EJECT,
  label: () => t.contextMenu.eject,
  icon: faEject,
  isVisible: (ctx) => ctx.isRemovable,
  run: async ({ fs, path, refreshVolumes, onClose }) => {
    onClose();
    try {
      await fs.ejectVolume(path);
      notify(t.volumes.ejected(basename(path)), TOAST_TYPE.SUCCESS);
      refreshVolumes();
    } catch (error) {
      notify(t.errors.eject(String(error)), TOAST_TYPE.ERROR);
    }
  },
};
