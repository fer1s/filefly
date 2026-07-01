import type { ToastType } from "@/shared/toast";

export type ToastData = {
  id: number;
  message: string;
  type: ToastType;
  // True once the toast is animating out, just before it's removed from the stack.
  leaving?: boolean;
  // When set, the toast is clickable: clicking runs this (then dismisses). E.g. jump to the
  // folder a file was moved/copied/restored to, or open the Trash.
  onAction?: () => void;
};

export type ToastProps = {
  toast: ToastData;
  onDismiss: (id: number) => void;
};
