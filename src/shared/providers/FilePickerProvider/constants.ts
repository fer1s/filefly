import {
  PICK_KIND,
  type PickerConfig,
} from "@/shared/components/patterns/PathPickerDialog";
import { t } from "@/lang";

// Static presentation config for the shared path picker in file mode. `extensions` varies per
// pickFile() call, so it's merged in by the provider rather than fixed here.
export const FILE_PICKER_CONFIG: Omit<PickerConfig, "extensions"> = {
  kind: PICK_KIND.FILE,
  title: t.filePicker.title,
  chooseLabel: t.filePicker.choose,
  emptyLabel: t.filePicker.empty,
};
