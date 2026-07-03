import {
  PICK_KIND,
  type PickerConfig,
} from "@/shared/components/patterns/PathPickerDialog";
import { t } from "@/lang";

// Presentation config for the shared path picker in folder mode.
export const FOLDER_PICKER_CONFIG: PickerConfig = {
  kind: PICK_KIND.FOLDER,
  title: t.folderPicker.title,
  chooseLabel: t.folderPicker.choose,
  emptyLabel: t.folderPicker.empty,
};
