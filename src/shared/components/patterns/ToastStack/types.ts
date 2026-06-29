import type { ToastData } from "@/shared/components/elements/Toast";

export type ToastStackProps = {
  toasts: ToastData[];
  onDismiss: (id: number) => void;
};
