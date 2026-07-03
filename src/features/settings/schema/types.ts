import type { ComponentType } from "react";

import type { AppSettings } from "@/shared/services/api";

import type { SettingsSectionId } from "./sections";

// The control kinds the generic renderer knows how to draw. CUSTOM is the escape hatch for
// settings whose UI (or modified/reset logic) doesn't fit a single control — e.g. the date-format
// pattern editor or the startup mode + home-folder pair.
export const SETTING_KIND = {
  TOGGLE: "toggle",
  SELECT: "select",
  RANGE: "range",
  CUSTOM: "custom",
} as const;

export type SettingKind = (typeof SETTING_KIND)[keyof typeof SETTING_KIND];

export type SettingKey = keyof AppSettings;

export type SettingsUpdate = (patch: Partial<AppSettings>) => void;

// Props every custom control (and its optional full-width "below" extra) receives: the live
// settings and the patch writer. Custom controls read/write settings directly.
export type CustomControlProps = {
  settings: AppSettings;
  update: SettingsUpdate;
};

type BaseDescriptor = {
  // Identity (also the React list key) and, for generic kinds, the AppSettings field bound to the
  // control and used for the automatic modified/reset. Custom kinds override that via isModified/
  // reset, so their `key` only needs to be unique.
  key: SettingKey;
  section: SettingsSectionId;
  // Lazily resolved so labels/hints honor the active i18n dictionary; also matched by the search.
  label: () => string;
  hint: () => string;
  // Drop the reset-to-default affordance entirely (button AND its reserved slot) for rows that can
  // never be "modified" — e.g. the informational Storage panel. Without this the row keeps the
  // empty reset gutter, which left-indents it out of line with the full-width content below.
  noReset?: boolean;
};

export type ToggleDescriptor = BaseDescriptor & {
  kind: typeof SETTING_KIND.TOGGLE;
};

export type SelectOption = { value: string; label: string };

export type SelectDescriptor = BaseDescriptor & {
  kind: typeof SETTING_KIND.SELECT;
  // Resolved lazily so option labels can be i18n'd or show live samples.
  options: () => SelectOption[];
  // The <select> value is always a string; map it back to the stored type (e.g. number zoom).
  toValue?: (raw: string) => string | number;
};

export type RangeDescriptor = BaseDescriptor & {
  kind: typeof SETTING_KIND.RANGE;
  min: number;
  max: number;
  step: number;
  // Convert between the stored value and the slider position (sidebar opacity is stored inverted
  // from the transparency the slider shows).
  toSlider?: (stored: number) => number;
  fromSlider?: (slider: number) => number;
  // The value shown beside the slider (e.g. "80%").
  format: (stored: number) => string;
};

export type CustomDescriptor = Omit<BaseDescriptor, "key"> & {
  kind: typeof SETTING_KIND.CUSTOM;
  // Custom entries own their modified/reset (below), so `key` only needs to be unique — it can be
  // an AppSettings field or a synthetic id for an entry that binds to no single setting (e.g. the
  // informational Storage panel).
  key: string;
  // Right-hand control, and an optional full-width extra rendered below the row (e.g. the custom
  // date pattern input, or the home-folder chooser). Both may render null when not applicable.
  Control: ComponentType<CustomControlProps>;
  Below?: ComponentType<CustomControlProps>;
  // Custom settings decide their own modified/reset because they may span several keys.
  isModified: (settings: AppSettings, defaults: AppSettings) => boolean;
  reset: (update: SettingsUpdate, defaults: AppSettings) => void;
};

export type SettingDescriptor =
  ToggleDescriptor | SelectDescriptor | RangeDescriptor | CustomDescriptor;
