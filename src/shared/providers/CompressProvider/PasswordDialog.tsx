import { useEffect, useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import Button from "@/shared/components/elements/Button";
import PasswordInput from "@/shared/components/patterns/PasswordInput";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { t } from "@/lang";

import "@/styles/components/CompressDialog.css";

import type { PasswordDialogProps } from "./types";

const TITLE_ID = "extract-password-dialog-title";

// Password prompt shown when extracting an encrypted archive. Enter submits, Escape/backdrop
// cancels. The caller runs the actual extraction with the entered password.
const PasswordDialog = ({
  visible,
  onSubmit,
  onClose,
}: PasswordDialogProps) => {
  useCloseOnEscape(visible, onClose);

  const [password, setPassword] = useState("");

  // Clear the field each time the dialog (re)opens.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear field on (re)open
    if (visible) setPassword("");
  }, [visible]);

  const canSubmit = password.length > 0;

  const submit = () => {
    if (canSubmit) onSubmit(password);
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="confirmation_modal"
      labelledBy={TITLE_ID}
    >
      <DialogHeader
        title={t.archive.passwordTitle}
        titleId={TITLE_ID}
        onClose={onClose}
      />
      <form
        className="confirmation_body"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="compress_field">
          <span>{t.archive.password}</span>
          <PasswordInput
            autoFocus
            placeholder={t.archive.passwordPrompt}
            value={password}
            // eslint-disable-next-line i18next/no-literal-string -- HTML autocomplete token
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <DialogActions>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button type="submit" className="primary" disabled={!canSubmit}>
            {t.archive.extractButton}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PasswordDialog;
