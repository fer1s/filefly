import { useEffect } from "react";

import {
  checkForUpdates,
  UPDATE_CHECK_STARTUP_DELAY_MS,
  UPDATE_STATUS,
} from "@/shared/services/updates";
import { openExternalUrl } from "@/shared/services/api";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

// Module flag (not a ref) so an HMR remount / StrictMode double-run doesn't re-notify.
let notifiedVersion: string | null = null;

// Launch-time update check: once settings are hydrated and the setting is on, wait a moment (so it
// never competes with the first listing) then check GitHub Releases. A newer version surfaces as a
// clickable toast that opens the release page. Fire-and-forget; failures stay silent (the Settings
// row shows the error state on a manual check).
export const useUpdateCheck = (enabled: boolean, ready: boolean) => {
  useEffect(() => {
    if (!enabled || !ready) return;
    const timer = window.setTimeout(async () => {
      const result = await checkForUpdates();
      if (
        result.status !== UPDATE_STATUS.AVAILABLE ||
        !result.latest ||
        notifiedVersion === result.latest.version
      )
        return;
      notifiedVersion = result.latest.version;
      const { url, version } = result.latest;
      notify(
        t.updates.availableToast(version),
        TOAST_TYPE.INFO,
        () => void openExternalUrl(url),
      );
    }, UPDATE_CHECK_STARTUP_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, ready]);
};
