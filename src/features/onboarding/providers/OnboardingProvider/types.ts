export type OnboardingContextValue = {
  // Whether the welcome guide dialog is open. Visibility is owned by the provider.
  visible: boolean;
  open: () => void;
  close: () => void;
};
