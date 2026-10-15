import type { RefObject } from "react";

export type DropdownCoords = { top: number; left: number; width: number };

export type PathSearchProps = {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  onFocusChange: (focused: boolean) => void;
};
