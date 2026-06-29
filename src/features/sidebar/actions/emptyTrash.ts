import { ask } from "@tauri-apps/plugin-dialog";
import { faTrashCan } from "@fortawesome/free-solid-svg-icons";

import { notify, TOAST_TYPE } from "@/shared/toast";
import { UI_COLOR } from "@/shared/constants";
import { t } from "@/lang";

import { SIDEBAR_ACTION } from "./constants";
import type { SidebarAction } from "./types";

// Permanently empty the system Trash after confirmation. Refreshes the listing if the active
// tab is currently showing the Trash so the now-deleted items disappear.
export const emptyTrashAction: SidebarAction = {
  id: SIDEBAR_ACTION.EMPTY_TRASH,
  label: () => t.sidebar.emptyTrashTitle,
  icon: faTrashCan,
  color: UI_COLOR.DANGER,
  run: async ({ fs, path, currentPath, refreshDir, onClose }) => {
    onClose();

    const confirmed = await ask(t.sidebar.confirmEmptyTrash, {
      title: t.sidebar.emptyTrashTitle,
      kind: "warning",
    });
    if (!confirmed) return;

    try {
      const removed = await fs.emptyTrash();
      notify(
        removed > 0
          ? t.sidebar.trashEmptied(removed)
          : t.sidebar.trashAlreadyEmpty,
        TOAST_TYPE.SUCCESS,
      );
      if (currentPath === path) refreshDir();
    } catch (error) {
      notify(t.errors.emptyTrash(String(error)), TOAST_TYPE.ERROR);
    }
  },
};
