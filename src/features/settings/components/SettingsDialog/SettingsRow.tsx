import type { ReactNode } from "react";

type SettingsRowProps = {
  label: string;
  hint: string;
  // The control for this setting (checkbox switch, select, …).
  children: ReactNode;
};

// One settings entry: a label + hint on the left, its control on the right. The <label> wrapper
// makes clicking the text focus/toggle the control.
const SettingsRow = ({ label, hint, children }: SettingsRowProps) => (
  <label className="settings_row">
    <span className="settings_row_text">
      <span className="settings_row_label">{label}</span>
      <span className="settings_row_hint">{hint}</span>
    </span>
    {children}
  </label>
);

export default SettingsRow;
