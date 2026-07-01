import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/Switcher.css";

import type { SwitcherProps } from "./types";

// A pill on/off toggle. Built on a native checkbox so it stays keyboard- and screen-reader-
// accessible; the checkbox is visually restyled as a sliding switch.
const Switcher = forwardRef<HTMLInputElement, SwitcherProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={classNames("Switcher", className)}
      {...props}
    />
  ),
);

export default Switcher;
