import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { SettingsDialogProps } from "./types";

// Lazy: the settings dialog (schema + ~20 controls + storage/cleanup panels) is the largest
// rarely-opened surface, so its chunk loads on the first ⌘, / gear click.
export default lazyWhen<SettingsDialogProps>(
  () => import("./SettingsDialog"),
  (props) => props.visible,
);
export type { SettingsDialogProps } from "./types";
