import { lazy } from "react";

import { MountOnce } from "@/shared/components/patterns/Deferred";

import { useOnboarding } from "../../providers/OnboardingProvider";
import { useOnboardingAutoOpen } from "../../hooks/useOnboardingAutoOpen";
import type { OnboardingDialogProps } from "./types";

const OnboardingDialogView = lazy(() => import("./OnboardingDialog"));

// Always-mounted host: runs the launch auto-open logic eagerly and loads the dialog chunk only the
// first time the guide opens (most launches never do).
const OnboardingDialogHost = ({ settingsReady }: OnboardingDialogProps) => {
  const { visible } = useOnboarding();
  useOnboardingAutoOpen(settingsReady);
  return (
    <MountOnce when={visible}>
      <OnboardingDialogView />
    </MountOnce>
  );
};

export default OnboardingDialogHost;
