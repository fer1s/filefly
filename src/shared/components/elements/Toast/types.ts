import type { ToastType } from "@/shared/toast";

export type ToastData = {
  id: number;
  message: string;
  type: ToastType;
};

export type ToastProps = {
  toast: ToastData;
  onDismiss: (id: number) => void;
};
