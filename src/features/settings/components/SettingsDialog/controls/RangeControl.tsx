import { useEffect, useRef, useState } from "react";

import Slider from "@/shared/components/elements/Slider";
import { useDebouncedCallback } from "@/shared/hooks/useDebouncedCallback";

import { RANGE_COMMIT_DEBOUNCE_MS } from "../constants";
import type { RangeControlProps } from "./types";

// Numeric setting → a slider plus its live value. `toSlider`/`fromSlider` bridge the stored value
// and the slider position (opacity is stored inverted from the transparency shown). The slider
// position is local state so the thumb tracks the pointer instantly; the store commit is debounced
// (and flushed on release) so mid-drag churn doesn't flicker the reset control or thrash persistence.
const RangeControl = ({ descriptor, settings, update }: RangeControlProps) => {
  const toSlider = descriptor.toSlider ?? ((value: number) => value);
  const fromSlider = descriptor.fromSlider ?? ((value: number) => value);
  const stored = Number(settings[descriptor.key]);

  const [pos, setPos] = useState(() => toSlider(stored));
  const dragging = useRef(false);

  // Debounced commit to settings so a drag doesn't spam updates (each recomputes modified/reset and
  // persists); flushed immediately on release. The thumb tracks the pointer via local `pos`.
  const { schedule, flush } = useDebouncedCallback((sliderPos: number) => {
    update({ [descriptor.key]: fromSlider(sliderPos) });
  }, RANGE_COMMIT_DEBOUNCE_MS);

  // Adopt external changes (e.g. reset-to-default) when we're not mid-drag.
  useEffect(() => {
    if (!dragging.current) setPos(toSlider(stored));
    // toSlider is stable for a given descriptor; re-run only when the stored value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored]);

  return (
    <span className="settings_range_control">
      <Slider
        className="settings_range"
        min={descriptor.min}
        max={descriptor.max}
        step={descriptor.step}
        value={pos}
        onPointerDown={() => {
          dragging.current = true;
        }}
        onChange={(event) => {
          const next = Number(event.target.value);
          setPos(next);
          schedule(next);
        }}
        onPointerUp={(event) => {
          dragging.current = false;
          flush(Number((event.target as HTMLInputElement).value));
        }}
        onBlur={(event) => {
          dragging.current = false;
          flush(Number(event.target.value));
        }}
      />
      {/* Value reflects the live local position, not the debounced store. */}
      <span className="settings_range_value">
        {descriptor.format(fromSlider(pos))}
      </span>
    </span>
  );
};

export default RangeControl;
