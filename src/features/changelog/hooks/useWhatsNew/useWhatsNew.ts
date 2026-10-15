import { useEffect, useRef } from "react";
import { getVersion } from "@tauri-apps/api/app";

import { compareVersions } from "@/shared/services/updates";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { useSettings } from "@/features/settings";
import { t } from "@/lang";

import { useChangelog } from "../../providers/ChangelogProvider";
import {
  FORCE_WHATS_NEW_TEST,
  FORCE_WHATS_NEW_PREVIOUS_VERSION,
} from "../../constants";

// Post-update detection, once per session after settings hydrate: compare the running version with
// `lastSeenVersion`. Newer → a clickable toast opening the changelog on that version (unless the
// user turned it off). Empty (fresh install) → nothing here; the welcome guide covers that case.
// Either way the running version is recorded so the next launch compares against it.
export const useWhatsNew = (settingsReady: boolean) => {
  const { settings, update } = useSettings();
  const { open } = useChangelog();
  const ran = useRef(false);

  useEffect(() => {
    if (!settingsReady || ran.current) return;
    ran.current = true;
    const { showChangelogAfterUpdate } = settings;
    const lastSeenVersion = FORCE_WHATS_NEW_TEST
      ? FORCE_WHATS_NEW_PREVIOUS_VERSION
      : settings.lastSeenVersion;
    void getVersion().then((current) => {
      if (
        lastSeenVersion !== "" &&
        compareVersions(current, lastSeenVersion) > 0 &&
        showChangelogAfterUpdate
      ) {
        notify(t.changelog.updatedToast(current), TOAST_TYPE.INFO, () =>
          open(current),
        );
      }
      if (lastSeenVersion !== current) update({ lastSeenVersion: current });
    });
  }, [settingsReady, settings, update, open]);
};
