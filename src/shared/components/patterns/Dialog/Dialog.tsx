import { classNames } from "@/shared/utils";

import "@/styles/components/Dialog.css";

import type { DialogProps } from "./types";

const Dialog = ({
  visible,
  onClose,
  children,
  className,
  labelledBy,
}: DialogProps) => (
  <>
    <div
      className={classNames("dialog_backdrop", visible && "visible")}
      onClick={onClose}
    />
    <div
      className={classNames("dialog", "shadow", className, visible && "visible")}
      role="dialog"
      aria-modal="true"
      aria-hidden={!visible}
      aria-labelledby={labelledBy}
    >
      {children}
    </div>
  </>
);

export default Dialog;
