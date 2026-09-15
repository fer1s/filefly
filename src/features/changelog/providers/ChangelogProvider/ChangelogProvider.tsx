import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ChangelogContext } from "./ChangelogContext";

// Owns the "what's new" dialog's open state (and which version it opens on). Sits above
// SettingsProvider so the settings dialog's "Show changelog" button can reach it; the dialog itself
// is mounted below (see ChangelogDialog) because it reads settings.
export const ChangelogProvider = ({ children }: { children: ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [version, setVersion] = useState<string | null>(null);

  const open = useCallback((v?: string) => {
    setVersion(v ?? null);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(
    () => ({ visible, version, open, close }),
    [visible, version, open, close],
  );
  return (
    <ChangelogContext.Provider value={value}>
      {children}
    </ChangelogContext.Provider>
  );
};
