import type { SelectHTMLAttributes } from "react";

// Native single-select dropdown. Callers pass <option> children plus value/onChange; the element
// only supplies the theme-aware surface so it reads correctly in both light and dark mode.
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;
