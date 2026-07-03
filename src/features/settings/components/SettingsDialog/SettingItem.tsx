import { faRotateLeft } from "@fortawesome/free-solid-svg-icons";

import IconButton, {
  ICON_BUTTON_SIZE,
} from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { SETTING_KIND } from "../../schema";
import ToggleControl from "./controls/ToggleControl";
import SelectControl from "./controls/SelectControl";
import RangeControl from "./controls/RangeControl";
import type { SettingItemProps } from "./types";

// One settings entry rendered generically from its descriptor: a reset-to-default button (left),
// label + hint, and the control chosen by `kind` (custom kinds bring their own). Custom kinds may
// also render a full-width extra below the row.
//
// The reset lives on the LEFT and keeps its slot reserved (hidden, not removed, when unmodified):
// if it toggled next to the control, landing a dragged slider on its default would remove the
// button, reflow the row, and shift the slider out from under the still-pressed pointer.
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
        {!descriptor.noReset && (
          <IconButton
            icon={faRotateLeft}
            size={ICON_BUTTON_SIZE.SM}
            tooltip={t.settings.reset}
            aria-label={t.settings.reset}
            className={classNames("settings_reset", !modified && "hidden")}
            onClick={onReset}
            disabled={!modified}
          />
        )}
        <span className="settings_row_text">
          <span className="settings_row_label">{descriptor.label()}</span>
          <span className="settings_row_hint">{descriptor.hint()}</span>
        </span>
        <span className="settings_item_control">{control()}</span>
      </div>
      {Below && <Below settings={settings} update={update} />}
    </div>
  );
};

export default SettingItem;
