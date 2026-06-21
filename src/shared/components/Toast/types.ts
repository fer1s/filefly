import { ToastType } from "@/shared/toast";

export type ToastData = { id: number; message: string; type: ToastType };

export type ToastsProps = {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
};
