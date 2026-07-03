import { useEffect, useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import Button from "@/shared/components/elements/Button";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";
import { t } from "@/lang";

import "@/styles/components/ConfirmationDialog.css";

import { CONFIRMATION_TITLE_ID, NON_TEXT_INPUT_TYPES } from "./constants";
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
  extra,
  onConfirm,
  onClose,
}: ConfirmationDialogProps) => {
  useCloseOnEscape(visible, onClose);

  // Enter always accepts (Confirm) — it's the dialog's default action. Even the focus the dialog
  // grabs on open (its close button) shouldn't steal it, so this preventDefaults and confirms
  // regardless of what's focused. The only exception is a text field in `extra`, where Enter needs
  // to reach the input; there are none today, but the guard keeps it safe if one is ever added.
  useEffect(() => {
    if (!visible) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== KEY.ENTER) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === "TEXTAREA" ||
          (active.tagName === "INPUT" &&
            !NON_TEXT_INPUT_TYPES.includes((active as HTMLInputElement).type)))
      )
        return;
      event.preventDefault();
      onConfirm();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [visible, onConfirm]);

  // Retain last content while the dialog fades out. Callers null their state on close, which would
  // otherwise blank the title/message before the 0.2s close animation finishes.
  const [shown, setShown] = useState({ title, message, extra });
  if (
    visible &&
    (shown.title !== title ||
      shown.message !== message ||
      shown.extra !== extra)
  ) {
    setShown({ title, message, extra });
  }
  const content = visible ? { title, message, extra } : shown;

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="confirmation_modal"
      labelledBy={CONFIRMATION_TITLE_ID}
    >
      <DialogHeader
        title={content.title}
        titleId={CONFIRMATION_TITLE_ID}
        onClose={onClose}
      />

      <div className="confirmation_body">
        <p className="confirmation_message">{content.message}</p>
        {content.extra && (
          <div className="confirmation_extra">{content.extra}</div>
        )}
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
