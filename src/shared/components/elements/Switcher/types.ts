import type { InputHTMLAttributes } from "react";

// A controlled on/off toggle. Same props as a checkbox input minus `type` (always "checkbox").
export type SwitcherProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
