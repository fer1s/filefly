import { useEffect, useRef } from "react";

import { useSettings } from "@/features/settings";

import { useOnboarding } from "../../providers/OnboardingProvider";

// Auto-open the welcome guide on launch, once per session. Gated on hydration so the defaults
// (showOnboarding: true) don't fire the guide before settings.toml has been read; the ref keeps a
// later toggle of showOnboarding in Settings from popping the guide over the settings dialog.
// Fresh installs only (no version recorded yet): after an update the what's-new toast takes over,
// so the guide doesn't pile on top of it.
export const useOnboardingAutoOpen = (settingsReady: boolean) => {
  const { settings } = useSettings();
  const { open } = useOnboarding();
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!settingsReady || autoOpened.current) return;
    autoOpened.current = true;
    if (
      settings.showOnboarding &&
      !settings.onboardingSeen &&
      settings.lastSeenVersion === ""
    )
      open();
  }, [
    settingsReady,
    settings.showOnboarding,
    settings.onboardingSeen,
    settings.lastSeenVersion,
    open,
  ]);
};
