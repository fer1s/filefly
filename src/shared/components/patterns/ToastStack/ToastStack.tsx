import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/Toast.css";

import type { ToastsProps } from "./types";

const Toasts = ({ toasts, onDismiss }: ToastsProps) => {
  return (
    <div className="toasts">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={classNames("toast", toast.type)}
          onClick={() => onDismiss(toast.id)}
          title={t.common.dismiss}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

export default Toasts;
