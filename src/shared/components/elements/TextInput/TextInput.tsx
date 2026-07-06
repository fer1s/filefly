import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/TextInput.css";

import type { TextInputProps } from "./types";

// Base single-line text input: theme-aware surface/border/text so it reads correctly in both light
// and dark mode (raw <input> falls back to the browser's white box). Forwards the ref + every native
// attribute, so callers keep full control (value, onChange, placeholder, autoFocus, …).
const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ type = "text", className, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={classNames("TextInput", className)}
      {...props}
    />
  ),
);

TextInput.displayName = "TextInput";

export default TextInput;
