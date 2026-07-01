import { faTerminal } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { VOLUME_ACTION } from "./constants";
import type { VolumeAction } from "./types";

// Open a terminal at the volume's mount point.
export const openInTerminalAction: VolumeAction = {
  id: VOLUME_ACTION.OPEN_IN_TERMINAL,
  label: () => t.contextMenu.openInTerminal,
  icon: faTerminal,
  run: ({ fs, path, onClose }) => {
    fs.openInTerminal(path);
    onClose();
  },
};
