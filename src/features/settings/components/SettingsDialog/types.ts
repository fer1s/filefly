import type { AppSettings } from "@/shared/services/api";

import type {
  SettingDescriptor,
  SettingsSectionId,
  SettingsUpdate,
} from "../../schema";

export type SettingsDialogProps = {
  visible: boolean;
  onClose: () => void;
};

export type SettingItemProps = {
  descriptor: SettingDescriptor;
  settings: AppSettings;
  update: SettingsUpdate;
  defaults: AppSettings;
};

export type SettingsNavProps = {
  active: SettingsSectionId;
  // Match count per section for the current search (all-totals when not searching). Sections with
  // zero are dimmed so the nav doubles as a "where are the results" hint.
  counts: Record<SettingsSectionId, number>;
  onSelect: (id: SettingsSectionId) => void;
};
