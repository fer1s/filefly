import type { ChangeEvent } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { pickFolder } from "@/shared/services/api";
import { basename } from "@/shared/utils";
import { STARTUP_MODE, type StartupMode } from "@/shared/constants";
import { t } from "@/lang";

import SettingsRow from "./SettingsRow";

// Launch behavior: a dropdown choosing what opens on start — the previous tab session, a fresh
// Volumes session, or a fresh session at a home folder. When "home" is picked, a folder chooser
// is revealed. The choice takes effect on the next launch (tab restoration runs at mount).
const StartupRow = () => {
  const { startupMode, setStartupMode, homePath, setHomePath } =
    useStateContext();

  const onSelect = (event: ChangeEvent<HTMLSelectElement>) =>
    setStartupMode(event.target.value as StartupMode);

  const onChoose = async () => {
    const chosen = await pickFolder();
    if (chosen !== null) setHomePath(chosen);
  };

  return (
    <>
      <SettingsRow label={t.settings.startup} hint={t.settings.startupHint}>
        <select
          className="settings_select"
          value={startupMode}
          onChange={onSelect}
        >
          <option value={STARTUP_MODE.RESTORE}>
            {t.settings.startupRestore}
          </option>
          <option value={STARTUP_MODE.VOLUMES}>
            {t.settings.startupVolumes}
          </option>
          <option value={STARTUP_MODE.HOME}>{t.settings.startupHome}</option>
        </select>
      </SettingsRow>

      {startupMode === STARTUP_MODE.HOME && (
        <SettingsRow
          label={t.settings.homeFolder}
          hint={t.settings.homeFolderHint}
        >
          <span className="settings_range_control">
            <span className="settings_range_value">
              {homePath ? basename(homePath) : t.settings.homeFolderVolumes}
            </span>
            <button
              type="button"
              className="settings_button"
              onClick={onChoose}
            >
              {t.settings.choose}
            </button>
          </span>
        </SettingsRow>
      )}
    </>
  );
};

export default StartupRow;
