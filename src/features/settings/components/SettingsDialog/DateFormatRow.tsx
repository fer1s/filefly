import { useState, type ChangeEvent } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { formatDate, formatWithPattern } from "@/shared/utils";
import { DATE_FORMAT_LOCALE } from "@/shared/constants";
import { t } from "@/lang";

import { DATE_FORMAT_CUSTOM, DATE_FORMAT_PRESETS } from "./constants";
import SettingsRow from "./SettingsRow";

// A starter pattern seeded into the custom input when switching to "Custom…" from a preset.
const CUSTOM_SEED = "YYYY-MM-DD HH:mm";

// Date-format setting: a dropdown of preset patterns (each shown as a live sample) plus a
// "Custom…" option that reveals a token input with a live preview. The chosen value (a token
// pattern or the locale sentinel) is persisted in global state and used wherever dates render.
const DateFormatRow = () => {
  const { dateFormat, setDateFormat } = useStateContext();
  const now = new Date();
  const nowSecs = Math.floor(now.getTime() / 1000);

  const isPreset =
    dateFormat === DATE_FORMAT_LOCALE ||
    DATE_FORMAT_PRESETS.includes(dateFormat);
  const selectValue = isPreset ? dateFormat : DATE_FORMAT_CUSTOM;

  // Remember the last custom pattern so toggling away and back doesn't lose it.
  const [customText, setCustomText] = useState(
    isPreset ? CUSTOM_SEED : dateFormat,
  );

  const onSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setDateFormat(value === DATE_FORMAT_CUSTOM ? customText : value);
  };

  const onCustomChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCustomText(value);
    setDateFormat(value);
  };

  return (
    <>
      <SettingsRow
        label={t.settings.dateFormat}
        hint={t.settings.dateFormatHint}
      >
        <select
          className="settings_select"
          value={selectValue}
          onChange={onSelect}
        >
          <option value={DATE_FORMAT_LOCALE}>
            {t.settings.dateFormatLocale}
          </option>
          {DATE_FORMAT_PRESETS.map((pattern) => (
            <option key={pattern} value={pattern}>
              {formatWithPattern(now, pattern)}
            </option>
          ))}
          <option value={DATE_FORMAT_CUSTOM}>
            {t.settings.dateFormatCustom}
          </option>
        </select>
      </SettingsRow>

      {selectValue === DATE_FORMAT_CUSTOM && (
        <div className="settings_date_custom">
          <input
            type="text"
            className="settings_input"
            value={dateFormat}
            onChange={onCustomChange}
            placeholder={t.settings.dateFormatPlaceholder}
            spellCheck={false}
            aria-label={t.settings.dateFormat}
          />
          <span className="settings_preview">
            {t.settings.dateFormatPreview(formatDate(nowSecs, dateFormat))}
          </span>
        </div>
      )}
    </>
  );
};

export default DateFormatRow;
