import type { ToastType } from "@/shared/toast";

export type ToastData = {
  id: number;
  message: string;
  type: ToastType;
  // True once the toast is animating out, just before it's removed from the stack.
  leaving?: boolean;
};

export type ToastProps = {
  toast: ToastData;
  onDismiss: (id: number) => void;
};
