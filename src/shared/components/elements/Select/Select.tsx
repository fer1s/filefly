import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/Select.css";

import type { SelectProps } from "./types";

// Base dropdown: theme-aware surface/border/text + accent focus ring so it matches TextInput and
// never falls back to the browser's default white box. Forwards the ref + every native attribute
// (value, onChange, disabled, …); callers supply the <option> children.
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={classNames("Select", className)} {...props}>
      {children}
    </select>
  ),
);

Select.displayName = "Select";

export default Select;
