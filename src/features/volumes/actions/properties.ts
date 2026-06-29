import { faCircleInfo } from "@fortawesome/free-solid-svg-icons";

import { t } from "@/lang";

import { VOLUME_ACTION } from "./constants";
import type { VolumeAction } from "./types";

// Open the properties dialog for the volume's mount point.
export const propertiesAction: VolumeAction = {
  id: VOLUME_ACTION.PROPERTIES,
  label: () => t.contextMenu.properties,
  icon: faCircleInfo,
  run: async ({ path, openProperties, onClose }) => {
    onClose();
    await openProperties(path);
  },
};
