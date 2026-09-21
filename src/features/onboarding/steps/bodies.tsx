import type { ChangeEvent } from "react";

import Select from "@/shared/components/elements/Select";
import Switcher from "@/shared/components/elements/Switcher";
import Checkbox from "@/shared/components/elements/Checkbox";
import { THEME } from "@/shared/constants";
import {
  useKeymap,
  formatBinding,
  isMacPlatform,
  KEYMAP_ACTION,
  type KeymapAction,
} from "@/shared/keymap";
import {
  AccentControl,
  FolderHandlerControl,
  type CustomControlProps,
} from "@/features/settings";
import { t } from "@/lang";

// Theme dropdown + accent swatches. Both write settings immediately, so the running app is the
// preview (same controls as Settings › Appearance).
export const AppearanceBody = ({ settings, update }: CustomControlProps) => {
  const onTheme = (event: ChangeEvent<HTMLSelectElement>) =>
    update({ theme: event.target.value });
  return (
    <div className="onboarding_rows">
      <label className="onboarding_row">
        <span className="onboarding_row_label">
          {t.onboarding.steps.appearance.theme}
        </span>
        <Select
          className="settings_select"
          value={settings.theme}
          onChange={onTheme}
        >
          <option value={THEME.SYSTEM}>{t.settings.themeSystem}</option>
          <option value={THEME.LIGHT}>{t.settings.themeLight}</option>
          <option value={THEME.DARK}>{t.settings.themeDark}</option>
        </Select>
      </label>
      <div className="onboarding_row">
        <span className="onboarding_row_label">
          {t.onboarding.steps.appearance.accent}
        </span>
        <AccentControl settings={settings} update={update} />
      </div>
    </div>
  );
};

// The handful of bindings worth learning first, read from the live keymap so rebinding shows.
const SHORTCUT_ROWS: { action: KeymapAction; label: () => string }[] = [
  {
    action: KEYMAP_ACTION.OPEN_SETTINGS,
    label: () => t.onboarding.steps.shortcuts.openSettings,
  },
  {
    action: KEYMAP_ACTION.TOGGLE_SIDEBAR,
    label: () => t.onboarding.steps.shortcuts.toggleSidebar,
  },
  {
    action: KEYMAP_ACTION.NEW_TAB,
    label: () => t.onboarding.steps.shortcuts.newTab,
  },
  {
    action: KEYMAP_ACTION.SEARCH,
    label: () => t.onboarding.steps.shortcuts.search,
  },
  {
    action: KEYMAP_ACTION.TOGGLE_HIDDEN,
    label: () => t.onboarding.steps.shortcuts.toggleHidden,
  },
  {
    action: KEYMAP_ACTION.HELP_SHORTCUTS,
    label: () => t.onboarding.steps.shortcuts.helpShortcuts,
  },
];

export const ShortcutsBody = () => {
  const { keymap } = useKeymap();
  return (
    <dl className="onboarding_shortcuts">
      {SHORTCUT_ROWS.map(({ action, label }) => (
        <div key={action} className="onboarding_shortcut">
          <dt>{label()}</dt>
          <dd>
            <kbd>{formatBinding(keymap[action])}</kbd>
          </dd>
        </div>
      ))}
    </dl>
  );
};

// Default-folder-handler (macOS Launch Services, OS state) + folder sizes (settings toggle).
export const IntegrationBody = ({ settings, update }: CustomControlProps) => (
  <div className="onboarding_rows">
    {isMacPlatform() && (
      <div className="onboarding_row">
        <span className="onboarding_row_label">
          {t.onboarding.steps.integration.folderHandler}
        </span>
        <FolderHandlerControl />
      </div>
    )}
    <label className="onboarding_row">
      <span className="onboarding_row_text">
        <span className="onboarding_row_label">
          {t.onboarding.steps.integration.folderSizes}
        </span>
        <span className="onboarding_row_hint">
          {t.onboarding.steps.integration.folderSizesHint}
        </span>
      </span>
      <Switcher
        checked={settings.showFolderSizes}
        onChange={() => update({ showFolderSizes: !settings.showFolderSizes })}
      />
    </label>
  </div>
);

// Last page: opt out of seeing the guide again on launch.
export const FinishBody = ({ settings, update }: CustomControlProps) => (
  <label className="onboarding_show_again">
    <Checkbox
      checked={settings.showOnboarding}
      onChange={() => update({ showOnboarding: !settings.showOnboarding })}
    />
    <span>{t.onboarding.showAgain}</span>
  </label>
);
