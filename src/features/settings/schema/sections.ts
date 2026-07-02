import { t } from "@/lang";

// The setting categories shown in the dialog's left nav, in display order. Adding a section is
// declarative: add an id here (+ its label under settings.sections in the dictionary) and tag
// descriptors with it in schema.ts.
export const SETTINGS_SECTION = {
  GENERAL: "general",
  APPEARANCE: "appearance",
  VIEW: "view",
  SIDEBAR: "sidebar",
  DRAG_DROP: "dragDrop",
  NOTIFICATIONS: "notifications",
  STARTUP: "startup",
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
  { id: SETTINGS_SECTION.VIEW, label: () => t.settings.sections.view },
  { id: SETTINGS_SECTION.SIDEBAR, label: () => t.settings.sections.sidebar },
  { id: SETTINGS_SECTION.DRAG_DROP, label: () => t.settings.sections.dragDrop },
  {
    id: SETTINGS_SECTION.NOTIFICATIONS,
    label: () => t.settings.sections.notifications,
  },
  { id: SETTINGS_SECTION.STARTUP, label: () => t.settings.sections.startup },
  { id: SETTINGS_SECTION.STORAGE, label: () => t.settings.sections.storage },
];
