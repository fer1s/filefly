import type { AppSettings } from "@/shared/services/api";

import type {
  ToggleDescriptor,
  SelectDescriptor,
  RangeDescriptor,
  SettingsUpdate,
} from "../../../schema";

// Shared shape for the generic controls: the descriptor they render, plus the live settings and
// the patch writer they bind to.
type ControlProps<D> = {
  descriptor: D;
  settings: AppSettings;
  update: SettingsUpdate;
};

export type ToggleControlProps = ControlProps<ToggleDescriptor>;
export type SelectControlProps = ControlProps<SelectDescriptor>;
export type RangeControlProps = ControlProps<RangeDescriptor>;
