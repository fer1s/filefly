import {
  useUpdateState,
  BREW_UPGRADE_COMMAND,
  RELEASES_URL,
  UPDATE_STATUS,
} from "@/shared/services/updates";
import { openExternalUrl } from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import SettingsButton from "../SettingsButton";

// Full-width extra under the Updates row: the installed version plus the outcome of the last check.
// When a newer release exists it offers the release page and the Homebrew upgrade command (the app
// ships unsigned via a cask, so the upgrade itself happens through brew, not in-app).
const UpdatesBelow = () => {
  const { status, current, latest } = useUpdateState();

  const copyCommand = () =>
    navigator.clipboard
      .writeText(BREW_UPGRADE_COMMAND)
      .then(() => notify(t.common.copied, TOAST_TYPE.SUCCESS));

  const message = (() => {
    switch (status) {
      case UPDATE_STATUS.UP_TO_DATE:
        return t.updates.upToDate;
      case UPDATE_STATUS.AVAILABLE:
        return latest ? t.updates.available(latest.version) : "";
      case UPDATE_STATUS.ERROR:
        return t.updates.error;
      default:
        return "";
    }
  })();

  return (
    <div className="settings_row_below">
      <span className="settings_row_text">
        <span className="settings_row_label">
          {current
            ? t.updates.installedVersion(current)
            : t.updates.installedVersionUnknown}
        </span>
        {message && <span className="settings_row_hint">{message}</span>}
      </span>
      {status === UPDATE_STATUS.AVAILABLE && (
        <span className="settings_range_control">
          <SettingsButton
            onClick={() => void openExternalUrl(latest?.url ?? RELEASES_URL)}
          >
            {t.updates.viewRelease}
          </SettingsButton>
          <SettingsButton onClick={copyCommand}>
            {t.updates.copyBrewCommand}
          </SettingsButton>
        </span>
      )}
    </div>
  );
};

export default UpdatesBelow;
