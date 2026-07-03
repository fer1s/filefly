import { notify, TOAST_TYPE } from "@/shared/toast";
import { basename } from "@/shared/utils";
import { t } from "@/lang";
import type { FileSystemManager } from "@/shared/managers/FileSystemManager";

// Eject a volume and surface the outcome as a toast, then run `onEjected` (typically re-lists the
// volumes so the device disappears). Shared by the sidebar/volumes Eject actions and the inline
// eject button, so the behaviour stays identical wherever eject is triggered.
export const ejectVolume = async (
  fs: FileSystemManager,
  path: string,
  onEjected: () => void,
): Promise<void> => {
  try {
    await fs.ejectVolume(path);
    notify(t.volumes.ejected(basename(path)), TOAST_TYPE.SUCCESS);
    onEjected();
  } catch (error) {
    notify(t.errors.eject(String(error)), TOAST_TYPE.ERROR);
  }
};
