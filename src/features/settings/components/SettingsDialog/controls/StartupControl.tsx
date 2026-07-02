import type { ChangeEvent } from "react";

import { STARTUP_MODE } from "@/shared/constants";
import { t } from "@/lang";

import type { CustomControlProps } from "../../../schema";

// Right-hand control for the startup setting: a dropdown choosing what opens on launch — the
// previous session, a fresh Volumes session, or a fresh session at a home folder. The home-folder
// chooser (shown only for the "home" mode) lives in StartupBelow.
const StartupControl = ({ settings, update }: CustomControlProps) => {
  const onSelect = (event: ChangeEvent<HTMLSelectElement>) =>
    update({ startupMode: event.target.value });

  return (
    <select
      className="settings_select"
      value={settings.startupMode}
      onChange={onSelect}
    >
      <option value={STARTUP_MODE.RESTORE}>{t.settings.startupRestore}</option>
      <option value={STARTUP_MODE.VOLUMES}>{t.settings.startupVolumes}</option>
      <option value={STARTUP_MODE.HOME}>{t.settings.startupHome}</option>
    </select>
  );
};

export default StartupControl;
