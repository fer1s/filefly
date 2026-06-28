export type SettingsContextValue = {
  // Open / close the settings dialog. Visibility itself is owned by the provider.
  open: () => void;
  close: () => void;
};
