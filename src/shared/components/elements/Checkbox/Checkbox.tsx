import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/Checkbox.css";

import type { CheckboxProps } from "./types";

// Base checkbox: the app accent colour applied to the box (via accent-color) so ticks match the
// live theme instead of the browser default. Forwards the ref + every native attribute
// (checked/onChange/disabled…); `type` is fixed to "checkbox".
const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={classNames("Checkbox", className)}
      {...props}
    />
  ),
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
