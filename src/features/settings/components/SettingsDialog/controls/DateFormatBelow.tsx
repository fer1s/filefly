import type { ChangeEvent } from "react";

import TextInput from "@/shared/components/elements/TextInput";
import { formatDate } from "@/shared/utils";
import { t } from "@/lang";

import type { CustomControlProps } from "../../../schema";
import { isPresetDateFormat } from "../utils";

// Full-width extra for the date-format setting: shown only when a custom pattern is active, it lets
// the user edit the token pattern with a live preview. Hidden while a preset is selected.
const DateFormatBelow = ({ settings, update }: CustomControlProps) => {
  if (isPresetDateFormat(settings.dateFormat)) return null;

  const nowSecs = Math.floor(new Date().getTime() / 1000);

  const onChange = (event: ChangeEvent<HTMLInputElement>) =>
    update({ dateFormat: event.target.value });

  return (
    <div className="settings_date_custom">
      <TextInput
        className="settings_input"
        value={settings.dateFormat}
        onChange={onChange}
        placeholder={t.settings.dateFormatPlaceholder}
        spellCheck={false}
        aria-label={t.settings.dateFormat}
      />
      <span className="settings_preview">
        {t.settings.dateFormatPreview(formatDate(nowSecs, settings.dateFormat))}
      </span>
    </div>
  );
};

export default DateFormatBelow;
