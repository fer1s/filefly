import { t } from "@/lang";
import { classNames } from "@/shared/utils";
import Icon from "@/shared/components/elements/Icon";

import "@/styles/components/Toast.css";

import { TOAST_ICON } from "./constants";
import type { ToastProps } from "./types";

const Toast = ({ toast, onDismiss }: ToastProps) => (
  <div
    className={classNames("toast", toast.type, toast.leaving && "leaving")}
    onClick={() => onDismiss(toast.id)}
    title={t.common.dismiss}
  >
    <Icon icon={TOAST_ICON[toast.type]} className="toast_icon" />
    <span className="toast_message">{toast.message}</span>
  </div>
);

export default Toast;
