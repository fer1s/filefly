import type { InputHTMLAttributes } from "react";

// A checkbox input. `type` is fixed to "checkbox" by the element, so callers only pass checked/
// onChange and any other native attributes.
export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
