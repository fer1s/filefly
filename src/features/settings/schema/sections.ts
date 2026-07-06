import { t } from "@/lang";

// The setting categories shown in the dialog's left nav, in display order. Adding a section is
// declarative: add an id here (+ its label under settings.sections in the dictionary) and tag
// descriptors with it in schema.ts. Kept deliberately few — singleton sections were collapsed so
// the nav doesn't overwhelm: General (behavior + startup + OS integration), Appearance (everything
// visual), Files & Transfers (drag/drop), Notifications, and the read-only Storage panel.
export const SETTINGS_SECTION = {
  GENERAL: "general",
  APPEARANCE: "appearance",
  FILES: "files",
  NOTIFICATIONS: "notifications",
  REMOTE: "remote",
  STORAGE: "storage",
} as const;

export type SettingsSectionId =
  (typeof SETTINGS_SECTION)[keyof typeof SETTINGS_SECTION];

// Ordered sections with lazily-resolved labels (so they honor the active i18n dictionary).
export const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: () => string;
}[] = [
  { id: SETTINGS_SECTION.GENERAL, label: () => t.settings.sections.general },
  {
    id: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.sections.appearance,
  },
  { id: SETTINGS_SECTION.FILES, label: () => t.settings.sections.files },
  {
    id: SETTINGS_SECTION.NOTIFICATIONS,
    label: () => t.settings.sections.notifications,
  },
  { id: SETTINGS_SECTION.REMOTE, label: () => t.settings.sections.remote },
  { id: SETTINGS_SECTION.STORAGE, label: () => t.settings.sections.storage },
];
