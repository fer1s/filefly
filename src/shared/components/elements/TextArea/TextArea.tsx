import { forwardRef } from "react";

import { classNames } from "@/shared/utils";

import "@/styles/components/TextArea.css";

import type { TextAreaProps } from "./types";

// Base multi-line text input: the <textarea> sibling of TextInput with the same theme-aware
// surface/border/text (never the browser's default white box) and accent focus ring. Forwards the
// ref + every native attribute, so callers keep full control (value, onChange, rows, autoFocus, …).
const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={classNames("TextArea", className)}
      {...props}
    />
  ),
);

TextArea.displayName = "TextArea";

export default TextArea;
