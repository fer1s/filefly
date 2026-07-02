import { pickFolder } from "@/shared/services/api";
import { basename } from "@/shared/utils";
import { STARTUP_MODE } from "@/shared/constants";
import { t } from "@/lang";

import type { CustomControlProps } from "../../../schema";

// Full-width extra for the startup setting: the home-folder chooser, shown only when the "home"
// launch mode is selected. An empty home path falls back to the Volumes view on launch.
const StartupBelow = ({ settings, update }: CustomControlProps) => {
  if (settings.startupMode !== STARTUP_MODE.HOME) return null;

  const onChoose = async () => {
    const chosen = await pickFolder();
    if (chosen !== null) update({ homePath: chosen });
  };

  return (
    <div className="settings_row_below">
      <span className="settings_row_text">
        <span className="settings_row_label">{t.settings.homeFolder}</span>
        <span className="settings_row_hint">{t.settings.homeFolderHint}</span>
      </span>
      <span className="settings_range_control">
        <span className="settings_range_value">
          {settings.homePath
            ? basename(settings.homePath)
            : t.settings.homeFolderVolumes}
        </span>
        <button type="button" className="settings_button" onClick={onChoose}>
          {t.settings.choose}
        </button>
      </span>
    </div>
  );
};

export default StartupBelow;
