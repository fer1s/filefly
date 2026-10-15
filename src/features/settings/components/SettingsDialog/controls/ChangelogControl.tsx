import { useChangelog } from "@/features/changelog";
import { t } from "@/lang";

import { useSettings } from "../../../providers/SettingsProvider";
import SettingsButton from "../SettingsButton";

// "Show changelog" button: closes Settings (stacked modals fight for the MODAL scope) and opens
// the what's-new dialog on the newest entry. Binds to no AppSettings key; takes no props (the
// schema renders it with CustomControlProps, which it ignores).
const ChangelogControl = () => {
  const { close } = useSettings();
  const { open } = useChangelog();
  const onClick = () => {
    close();
    open();
  };
  return (
    <SettingsButton onClick={onClick}>
      {t.settings.changelogButton}
    </SettingsButton>
  );
};

export default ChangelogControl;
