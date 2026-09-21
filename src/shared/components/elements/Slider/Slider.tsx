import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/Slider.css";

import type { SliderProps } from "./types";

// Range slider with the app accent colour applied to the track/thumb (via accent-color). Forwards
// the ref + every native attribute (min/max/step/value/onChange…).
const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="range"
      className={classNames("Slider", className)}
      {...props}
    />
  ),
);

Slider.displayName = "Slider";

export default Slider;
