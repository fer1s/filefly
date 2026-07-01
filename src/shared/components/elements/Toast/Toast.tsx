import { t } from "@/lang";
import { classNames } from "@/shared/utils";
import { TOAST_TYPE } from "@/shared/toast";
import Icon from "@/shared/components/elements/Icon";

import "@/styles/components/Toast.css";

import { TOAST_ICON } from "./constants";
import type { ToastProps } from "./types";

const Toast = ({ toast, onDismiss }: ToastProps) => {
  // Errors interrupt (assertive); other notifications wait their turn (polite). The role implies
  // the matching aria-live, so screen readers announce the message when the toast mounts.
  const isError = toast.type === TOAST_TYPE.ERROR;
  const actionable = !!toast.onAction;

  return (
    <div
      className={classNames(
        "toast",
        toast.type,
        toast.leaving && "leaving",
        actionable && "actionable",
      )}
      // Clicking runs the action (if any) then dismisses; a plain toast just dismisses.
      onClick={() => {
        toast.onAction?.();
        onDismiss(toast.id);
      }}
      title={actionable ? t.common.clickToReveal : t.common.dismiss}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <Icon icon={TOAST_ICON[toast.type]} className="toast_icon" />
      <span className="toast_message">{toast.message}</span>
    </div>
  );
};

export default Toast;
