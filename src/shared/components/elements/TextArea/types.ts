import type { TextareaHTMLAttributes } from "react";

// Multi-line text input. The <textarea> sibling of TextInput: same theme-aware surface, forwards the
// ref + every native attribute (value, onChange, placeholder, rows, spellCheck, …).
export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;
