import type { SelectControlProps } from "./types";

// Enum setting → a dropdown, bound generically. The <select> value is a string; `toValue` maps it
// back to the stored type (e.g. the numeric default zoom).
const SelectControl = ({
  descriptor,
  settings,
  update,
}: SelectControlProps) => (
  <select
    className="settings_select"
    value={String(settings[descriptor.key])}
    onChange={(event) =>
      update({
        [descriptor.key]: descriptor.toValue
          ? descriptor.toValue(event.target.value)
          : event.target.value,
      })
    }
  >
    {descriptor.options().map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

export default SelectControl;
