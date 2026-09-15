import type { ComponentType } from "react";

import type { CustomControlProps } from "@/features/settings";

// One page of the welcome guide. Bodies get the live settings + patch writer (the same contract as
// the settings dialog's custom controls) so a step can bind directly to AppSettings.
export type OnboardingStep = {
  id: string;
  // Lazily resolved so copy honours the active i18n dictionary.
  title: () => string;
  description: () => string;
  // Optional interactive content under the description.
  Body?: ComponentType<CustomControlProps>;
  // Skip the step on the current platform (e.g. macOS-only integrations).
  hidden?: () => boolean;
};
