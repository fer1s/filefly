import Toast from "@/shared/components/elements/Toast";

import "@/styles/components/ToastStack.css";

import type { ToastStackProps } from "./types";

const ToastStack = ({ toasts, onDismiss }: ToastStackProps) => {
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastStack;
