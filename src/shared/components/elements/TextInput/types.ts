import type { InputHTMLAttributes } from "react";

// Any single-line text-ish input (text, search, number, email, url…). Password gets its own pattern
// (PasswordInput) that layers a show/hide toggle on top of this element.
export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  // Skip the base `.TextInput` box and style purely from `className`. For bespoke fields (inline
  // rename overlays, breadcrumb path field, search bars) that still want ref forwarding + the
  // `type="text"` default.
  unstyled?: boolean;
}
