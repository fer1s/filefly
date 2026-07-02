import type { RangeControlProps } from "./types";

// Numeric setting → a slider plus its live value. `toSlider`/`fromSlider` bridge the stored value
// and the slider position (sidebar opacity is stored inverted from the transparency shown).
const RangeControl = ({ descriptor, settings, update }: RangeControlProps) => {
  const stored = Number(settings[descriptor.key]);
  const slider = descriptor.toSlider ? descriptor.toSlider(stored) : stored;

  return (
    <span className="settings_range_control">
      <input
        type="range"
        className="settings_range"
        min={descriptor.min}
        max={descriptor.max}
        step={descriptor.step}
        value={slider}
        onChange={(event) => {
          const next = Number(event.target.value);
          update({
            [descriptor.key]: descriptor.fromSlider
              ? descriptor.fromSlider(next)
              : next,
          });
        }}
      />
      <span className="settings_range_value">{descriptor.format(stored)}</span>
    </span>
  );
};

export default RangeControl;
