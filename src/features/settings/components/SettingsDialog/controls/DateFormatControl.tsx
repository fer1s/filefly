import type { ChangeEvent } from "react";

import Select from "@/shared/components/elements/Select";
import { formatWithPattern } from "@/shared/utils";
import { DATE_FORMAT_LOCALE } from "@/shared/constants";
import { t } from "@/lang";

import type { CustomControlProps } from "../../../schema";
import {
  DATE_FORMAT_CUSTOM,
  DATE_FORMAT_CUSTOM_SEED,
  DATE_FORMAT_PRESETS,
} from "../constants";
import { isPresetDateFormat } from "../utils";

// Right-hand control for the date-format setting: a dropdown of preset patterns (each shown as a
// live sample) plus a "Custom…" option. Picking Custom from a preset seeds a starter pattern; the
// editable pattern input itself lives in DateFormatBelow.
const DateFormatControl = ({ settings, update }: CustomControlProps) => {
  const now = new Date();
  const isPreset = isPresetDateFormat(settings.dateFormat);
  const selectValue = isPreset ? settings.dateFormat : DATE_FORMAT_CUSTOM;

  const onSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    update({
      dateFormat:
        value === DATE_FORMAT_CUSTOM ? DATE_FORMAT_CUSTOM_SEED : value,
    });
  };

  return (
    <Select className="settings_select" value={selectValue} onChange={onSelect}>
      <option value={DATE_FORMAT_LOCALE}>{t.settings.dateFormatLocale}</option>
      {DATE_FORMAT_PRESETS.map((pattern) => (
        <option key={pattern} value={pattern}>
          {formatWithPattern(now, pattern)}
        </option>
      ))}
      <option value={DATE_FORMAT_CUSTOM}>{t.settings.dateFormatCustom}</option>
    </Select>
  );
};

export default DateFormatControl;
