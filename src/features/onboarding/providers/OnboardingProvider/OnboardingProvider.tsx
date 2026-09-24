import { useCallback, useMemo, useState, type ReactNode } from "react";

import { OnboardingContext } from "./OnboardingContext";

// Owns only the welcome guide's open state. It sits ABOVE SettingsProvider (so the settings
// dialog's "Open guide" button can reach it) while the dialog itself is mounted below it (see
// OnboardingDialog) because its steps reuse settings controls that need the settings context.
export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const value = useMemo(
    () => ({ visible, open, close }),
    [visible, open, close],
  );
  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
