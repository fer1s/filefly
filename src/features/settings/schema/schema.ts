import {
  SIDEBAR_OPACITY_MIN,
  SIDEBAR_OPACITY_MAX,
  SIDEBAR_OPACITY_STEP,
  DRAG_DROP_ACTION,
  THEME,
} from "@/shared/constants";
import { t } from "@/lang";

import { ZOOM_OPTIONS } from "../components/SettingsDialog/constants";
import DateFormatControl from "../components/SettingsDialog/controls/DateFormatControl";
import DateFormatBelow from "../components/SettingsDialog/controls/DateFormatBelow";
import StartupControl from "../components/SettingsDialog/controls/StartupControl";
import StartupBelow from "../components/SettingsDialog/controls/StartupBelow";
import StorageControl from "../components/SettingsDialog/controls/StorageControl";
import StorageBelow from "../components/SettingsDialog/controls/StorageBelow";
import AccentControl from "../components/SettingsDialog/controls/AccentControl";
import FolderHandlerControl from "../components/SettingsDialog/controls/FolderHandlerControl";

import { SETTINGS_SECTION } from "./sections";
import { SETTING_KIND, type SettingDescriptor } from "./types";

const percent = (fraction: number) =>
  t.settings.zoomPercent(Math.round(fraction * 100));

// The single source of truth for the settings UI. Each entry declares one setting: which section
// it lives in, its label/hint, and how it binds to a control. Adding a setting is one entry here
// (plus its AppSettings field + dictionary strings) — the dialog renders, searches, groups, and
// wires modified/reset generically from this list.
export const SETTINGS_SCHEMA: readonly SettingDescriptor[] = [
  // ── General ── behavior basics, launch, and OS integration.
  {
    kind: SETTING_KIND.TOGGLE,
    key: "showHidden",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.showHidden,
    hint: () => t.settings.showHiddenHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "hideSystemRecents",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.hideSystemRecents,
    hint: () => t.settings.hideSystemRecentsHint,
  },
  {
    kind: SETTING_KIND.CUSTOM,
    key: "startupMode",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.startup,
    hint: () => t.settings.startupHint,
    Control: StartupControl,
    Below: StartupBelow,
    isModified: (settings, defaults) =>
      settings.startupMode !== defaults.startupMode ||
      settings.homePath !== defaults.homePath,
    reset: (update, defaults) =>
      update({
        startupMode: defaults.startupMode,
        homePath: defaults.homePath,
      }),
  },
  // macOS integration. OS state (Launch Services), not an AppSettings field: the control reads/
  // writes it live, so it's never "modified" and has no reset (synthetic key).
  {
    kind: SETTING_KIND.CUSTOM,
    key: "defaultFolderHandler",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.folderHandler,
    hint: () => t.settings.folderHandlerHint,
    Control: FolderHandlerControl,
    isModified: () => false,
    reset: () => {},
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "useCustomFolderPicker",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.useCustomFolderPicker,
    hint: () => t.settings.useCustomFolderPickerHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "previewImagesInApp",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.previewImagesInApp,
    hint: () => t.settings.previewImagesInAppHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "previewMarkdownInApp",
    section: SETTINGS_SECTION.GENERAL,
    label: () => t.settings.previewMarkdownInApp,
    hint: () => t.settings.previewMarkdownInAppHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "confirmExportOverwrite",
    section: SETTINGS_SECTION.FILES,
    label: () => t.settings.confirmExportOverwrite,
    hint: () => t.settings.confirmExportOverwriteHint,
  },

  // ── Appearance ── everything visual (theme, accent, zoom, dates, sidebar).
  {
    kind: SETTING_KIND.SELECT,
    key: "theme",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.theme,
    hint: () => t.settings.themeHint,
    options: () => [
      { value: THEME.SYSTEM, label: t.settings.themeSystem },
      { value: THEME.LIGHT, label: t.settings.themeLight },
      { value: THEME.DARK, label: t.settings.themeDark },
    ],
  },
  {
    kind: SETTING_KIND.CUSTOM,
    key: "accentColor",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.accent,
    hint: () => t.settings.accentHint,
    Control: AccentControl,
    isModified: (settings, defaults) =>
      settings.accentColor !== defaults.accentColor,
    reset: (update, defaults) => update({ accentColor: defaults.accentColor }),
  },
  {
    kind: SETTING_KIND.SELECT,
    key: "defaultZoom",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.defaultZoom,
    hint: () => t.settings.defaultZoomHint,
    options: () =>
      ZOOM_OPTIONS.map((zoom) => ({
        value: String(zoom),
        label: percent(zoom),
      })),
    toValue: Number,
  },
  {
    kind: SETTING_KIND.CUSTOM,
    key: "dateFormat",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.dateFormat,
    hint: () => t.settings.dateFormatHint,
    Control: DateFormatControl,
    Below: DateFormatBelow,
    isModified: (settings, defaults) =>
      settings.dateFormat !== defaults.dateFormat,
    reset: (update, defaults) => update({ dateFormat: defaults.dateFormat }),
  },
  {
    kind: SETTING_KIND.RANGE,
    key: "sidebarOpacity",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.sidebarTransparency,
    hint: () => t.settings.sidebarTransparencyHint,
    min: SIDEBAR_OPACITY_MIN,
    max: SIDEBAR_OPACITY_MAX,
    step: SIDEBAR_OPACITY_STEP,
    // UI is transparency (0 = solid, 1 = see-through); stored value is the inverse opacity.
    toSlider: (opacity) => SIDEBAR_OPACITY_MAX - opacity,
    fromSlider: (transparency) => SIDEBAR_OPACITY_MAX - transparency,
    format: (opacity) => percent(SIDEBAR_OPACITY_MAX - opacity),
  },
  {
    kind: SETTING_KIND.RANGE,
    key: "contextMenuOpacity",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.contextMenuTransparency,
    hint: () => t.settings.contextMenuTransparencyHint,
    // Same 0..1 range/step as the sidebar; shown inverted as transparency.
    min: SIDEBAR_OPACITY_MIN,
    max: SIDEBAR_OPACITY_MAX,
    step: SIDEBAR_OPACITY_STEP,
    toSlider: (opacity) => SIDEBAR_OPACITY_MAX - opacity,
    fromSlider: (transparency) => SIDEBAR_OPACITY_MAX - transparency,
    format: (opacity) => percent(SIDEBAR_OPACITY_MAX - opacity),
  },
  {
    kind: SETTING_KIND.RANGE,
    key: "previewControlsOpacity",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.previewControlsTransparency,
    hint: () => t.settings.previewControlsTransparencyHint,
    // Same 0..1 range/step as the sidebar; shown inverted as transparency.
    min: SIDEBAR_OPACITY_MIN,
    max: SIDEBAR_OPACITY_MAX,
    step: SIDEBAR_OPACITY_STEP,
    toSlider: (opacity) => SIDEBAR_OPACITY_MAX - opacity,
    fromSlider: (transparency) => SIDEBAR_OPACITY_MAX - transparency,
    format: (opacity) => percent(SIDEBAR_OPACITY_MAX - opacity),
  },
  {
    kind: SETTING_KIND.RANGE,
    key: "dialogOpacity",
    section: SETTINGS_SECTION.APPEARANCE,
    label: () => t.settings.dialogTransparency,
    hint: () => t.settings.dialogTransparencyHint,
    // Same 0..1 range/step as the sidebar; shown inverted as transparency.
    min: SIDEBAR_OPACITY_MIN,
    max: SIDEBAR_OPACITY_MAX,
    step: SIDEBAR_OPACITY_STEP,
    toSlider: (opacity) => SIDEBAR_OPACITY_MAX - opacity,
    fromSlider: (transparency) => SIDEBAR_OPACITY_MAX - transparency,
    format: (opacity) => percent(SIDEBAR_OPACITY_MAX - opacity),
  },

  // ── Files & Transfers ── what dragging entries onto folders / out of the window does.
  {
    kind: SETTING_KIND.SELECT,
    key: "dragDropAction",
    section: SETTINGS_SECTION.FILES,
    label: () => t.settings.dragDrop,
    hint: () => t.settings.dragDropHint,
    options: () => [
      { value: DRAG_DROP_ACTION.MOVE, label: t.settings.dragDropMove },
      { value: DRAG_DROP_ACTION.COPY, label: t.settings.dragDropCopy },
    ],
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "confirmDragDrop",
    section: SETTINGS_SECTION.FILES,
    label: () => t.settings.confirmDragDrop,
    hint: () => t.settings.confirmDragDropHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "confirmDelete",
    section: SETTINGS_SECTION.FILES,
    label: () => t.settings.confirmDelete,
    hint: () => t.settings.confirmDeleteHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "dragToExternalApps",
    section: SETTINGS_SECTION.FILES,
    label: () => t.settings.dragToExternalApps,
    hint: () => t.settings.dragToExternalAppsHint,
  },

  // ── Notifications ──
  {
    kind: SETTING_KIND.TOGGLE,
    key: "showToasts",
    section: SETTINGS_SECTION.NOTIFICATIONS,
    label: () => t.settings.showToasts,
    hint: () => t.settings.showToastsHint,
  },
  {
    kind: SETTING_KIND.TOGGLE,
    key: "clickableToasts",
    section: SETTINGS_SECTION.NOTIFICATIONS,
    label: () => t.settings.clickableToasts,
    hint: () => t.settings.clickableToastsHint,
  },

  // ── Storage ── informational: the app's on-disk footprint and where it lives. Binds to no
  // AppSettings field (synthetic key), so it's never "modified" and has no reset.
  {
    kind: SETTING_KIND.CUSTOM,
    key: "appStorage",
    section: SETTINGS_SECTION.STORAGE,
    label: () => t.settings.storage,
    hint: () => t.settings.storageHint,
    Control: StorageControl,
    Below: StorageBelow,
    isModified: () => false,
    reset: () => {},
  },
];
