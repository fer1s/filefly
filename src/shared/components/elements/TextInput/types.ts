import type { InputHTMLAttributes } from "react";

// Any single-line text-ish input (text, search, number, email, url…). Password gets its own pattern
// (PasswordInput) that layers a show/hide toggle on top of this element.
export type TextInputProps = InputHTMLAttributes<HTMLInputElement>;
