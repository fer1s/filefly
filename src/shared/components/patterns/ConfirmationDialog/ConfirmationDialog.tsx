import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import Button from "@/shared/components/elements/Button";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/ConfirmationDialog.css";

import { CONFIRMATION_TITLE_ID } from "./constants";
import type { ConfirmationDialogProps } from "./types";

// Reusable yes/no confirmation modal: a title, a message, and Cancel / Confirm actions. Escape or
// the backdrop cancels. Pass `destructive` to colour the confirm button as a dangerous action.
const ConfirmationDialog = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) => {
  useCloseOnEscape(visible, onClose);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="confirmation_modal"
      labelledBy={CONFIRMATION_TITLE_ID}
    >
      <DialogHeader
        title={title}
        titleId={CONFIRMATION_TITLE_ID}
        onClose={onClose}
      />

      <div className="confirmation_body">
        <p className="confirmation_message">{message}</p>
        <div className="confirmation_actions">
          <Button className="confirmation_cancel" onClick={onClose}>
            {cancelLabel ?? t.common.cancel}
          </Button>
          <Button
            className={classNames(
              "confirmation_confirm",
              destructive && "destructive",
            )}
            onClick={onConfirm}
          >
            {confirmLabel ?? t.common.confirm}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default ConfirmationDialog;
