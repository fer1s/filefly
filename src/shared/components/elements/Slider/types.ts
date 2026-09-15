import type { InputHTMLAttributes } from "react";

// A range/slider input. `type` is fixed to "range" by the element, so callers only pass min/max/step/
// value/onChange and any other native attributes.
export type SliderProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
