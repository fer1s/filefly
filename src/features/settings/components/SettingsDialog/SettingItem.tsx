import { t } from "@/lang";

import { SETTING_KIND } from "../../schema";
import { RESET_GLYPH } from "./constants";
import ToggleControl from "./controls/ToggleControl";
import SelectControl from "./controls/SelectControl";
import RangeControl from "./controls/RangeControl";
import type { SettingItemProps } from "./types";

// One settings entry rendered generically from its descriptor: label + hint, the control chosen by
// `kind` (custom kinds bring their own), a "modified" dot when the value differs from its default,
// and a reset-to-default button. Custom kinds may also render a full-width extra below the row.
const SettingItem = ({
  descriptor,
  settings,
  update,
  defaults,
}: SettingItemProps) => {
  const control = () => {
    switch (descriptor.kind) {
      case SETTING_KIND.TOGGLE:
        return (
          <ToggleControl
            descriptor={descriptor}
            settings={settings}
            update={update}
          />
        );
      case SETTING_KIND.SELECT:
        return (
          <SelectControl
            descriptor={descriptor}
            settings={settings}
            update={update}
          />
        );
      case SETTING_KIND.RANGE:
        return (
          <RangeControl
            descriptor={descriptor}
            settings={settings}
            update={update}
          />
        );
      case SETTING_KIND.CUSTOM: {
        const Control = descriptor.Control;
        return <Control settings={settings} update={update} />;
      }
    }
  };

  const Below =
    descriptor.kind === SETTING_KIND.CUSTOM ? descriptor.Below : undefined;

  const modified =
    descriptor.kind === SETTING_KIND.CUSTOM
      ? descriptor.isModified(settings, defaults)
      : settings[descriptor.key] !== defaults[descriptor.key];

  const onReset = () => {
    if (descriptor.kind === SETTING_KIND.CUSTOM)
      descriptor.reset(update, defaults);
    else update({ [descriptor.key]: defaults[descriptor.key] });
  };

  return (
    <div className="settings_item">
      <div className="settings_row">
        <span className="settings_row_text">
          <span className="settings_row_label">
            {descriptor.label()}
            {modified && (
              <span
                className="settings_modified_dot"
                title={t.settings.modified}
                aria-label={t.settings.modified}
              />
            )}
          </span>
          <span className="settings_row_hint">{descriptor.hint()}</span>
        </span>
        <span className="settings_item_control">
          {control()}
          {modified && (
            <button
              type="button"
              className="settings_reset"
              onClick={onReset}
              title={t.settings.reset}
              aria-label={t.settings.reset}
            >
              {RESET_GLYPH}
            </button>
          )}
        </span>
      </div>
      {Below && <Below settings={settings} update={update} />}
    </div>
  );
};

export default SettingItem;
