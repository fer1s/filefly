import { createContext, useContext } from "react";

import type { OnboardingContextValue } from "./types";

export const OnboardingContext = createContext<OnboardingContextValue | null>(
  null,
);

export const useOnboarding = () => {
  const value = useContext(OnboardingContext);
  if (!value)
    throw new Error("useOnboarding must be used within OnboardingProvider");
  return value;
};
