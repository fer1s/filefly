import SettingsButton from "../SettingsButton";
import {
  checkForUpdates,
  useUpdateState,
  UPDATE_STATUS,
} from "@/shared/services/updates";
import { t } from "@/lang";

// "Check now" button for the Updates row. Binds to no AppSettings key; the result renders in
// UpdatesBelow from the shared update store. Takes no props (the schema renders it with
// CustomControlProps, which it ignores).
const UpdatesControl = () => {
  const { status } = useUpdateState();
  const checking = status === UPDATE_STATUS.CHECKING;
  return (
    <SettingsButton disabled={checking} onClick={() => void checkForUpdates()}>
      {checking ? t.updates.checking : t.updates.checkNow}
    </SettingsButton>
  );
};

export default UpdatesControl;
