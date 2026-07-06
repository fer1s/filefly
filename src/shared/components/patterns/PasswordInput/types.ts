import type { TextInputProps } from "@/shared/components/elements/TextInput";

// Same props as TextInput minus `type` (fixed to password/text by the toggle). The reveal toggle is
// on by default; pass showToggle={false} for a plain masked field.
export type PasswordInputProps = Omit<TextInputProps, "type"> & {
  showToggle?: boolean;
};
