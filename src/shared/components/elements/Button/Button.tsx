import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/Button.css";

import type { ButtonProps } from "./types";

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ type = "button", className, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={classNames("Button", className)}
      {...props}
    />
  ),
);

export default Button;
