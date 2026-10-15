import { t } from "@/lang";

import {
  AppearanceBody,
  ShortcutsBody,
  IntegrationBody,
  FinishBody,
} from "./bodies";
import type { OnboardingStep } from "./types";

// The welcome guide's pages, in order. Adding a page is one entry here (+ its strings under
// onboarding.steps in the dictionary); the dialog renders navigation and progress from this list.
export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: "welcome",
    title: () => t.onboarding.steps.welcome.title,
    description: () => t.onboarding.steps.welcome.description,
  },
  {
    id: "appearance",
    title: () => t.onboarding.steps.appearance.title,
    description: () => t.onboarding.steps.appearance.description,
    Body: AppearanceBody,
  },
  {
    id: "shortcuts",
    title: () => t.onboarding.steps.shortcuts.title,
    description: () => t.onboarding.steps.shortcuts.description,
    Body: ShortcutsBody,
  },
  {
    id: "sidebar",
    title: () => t.onboarding.steps.sidebar.title,
    description: () => t.onboarding.steps.sidebar.description,
  },
  {
    id: "integration",
    title: () => t.onboarding.steps.integration.title,
    description: () => t.onboarding.steps.integration.description,
    Body: IntegrationBody,
  },
  {
    id: "finish",
    title: () => t.onboarding.steps.finish.title,
    description: () => t.onboarding.steps.finish.description,
    Body: FinishBody,
  },
];

// The steps applicable on this platform.
export const visibleSteps = () =>
  ONBOARDING_STEPS.filter((step) => !step.hidden?.());
