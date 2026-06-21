import { t } from "@/lang";
import { classNames } from "@/shared/utils";

import "@/styles/components/Toast.css";

import type { ToastProps } from "./types";

const Toast = ({ toast, onDismiss }: ToastProps) => (
  <div
    className={classNames("toast", toast.type)}
    onClick={() => onDismiss(toast.id)}
    title={t.common.dismiss}
  >
    {toast.message}
  </div>
);

export default Toast;
