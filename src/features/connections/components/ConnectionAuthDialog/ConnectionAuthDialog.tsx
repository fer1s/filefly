import { useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import Button from "@/shared/components/elements/Button";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/ConnectionDialog.css";

import type { ConnectionAuthDialogProps } from "./types";

const AUTH_TITLE_ID = "connection-auth-dialog-title";

// Shown when opening a connection fails authentication (SSH_AUTH_FAILED). Offers a single secret
// field — used as both the password and the key passphrase on retry, so it covers password auth and
// an encrypted key file — plus a hint for the ssh-agent case (where no secret is needed, just a
// reloaded key). Retry works with an empty field too, for that agent case.
const ConnectionAuthDialog = ({
  connection,
  onRetry,
  onClose,
}: ConnectionAuthDialogProps) => {
  const visible = connection !== null;
  useCloseOnEscape(visible, onClose);

  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time the dialog opens (or switches connection). Done during render with a
  // prev-guard — the React-sanctioned "adjust state when props change" pattern — instead of an
  // effect, so the reset lands in the same render pass with no cascading re-render.
  const openKey = visible ? (connection?.id ?? "") : null;
  const [prevOpenKey, setPrevOpenKey] = useState<string | null>(null);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    if (openKey !== null) {
      setSecret("");
      setBusy(false);
      setError(null);
    }
  }

  const retry = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onRetry(secret);
    } catch (err) {
      setBusy(false);
      setError(t.connections.authFailedRetry(String(err)));
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="connection_modal"
      labelledBy={AUTH_TITLE_ID}
    >
      <DialogHeader
        title={t.connections.authTitle(connection?.name ?? "")}
        titleId={AUTH_TITLE_ID}
        onClose={onClose}
      />

      <form
        className="connection_body"
        onSubmit={(event) => {
          event.preventDefault();
          void retry();
        }}
      >
        <p className="connection_hint">
          {t.connections.authFailed(
            `${connection?.user ?? ""}@${connection?.host ?? ""}`,
          )}
        </p>

        <label className="connection_field">
          <span>{t.connections.authSecret}</span>
          <input
            type="password"
            autoFocus
            value={secret}
            placeholder={t.connections.optional}
            onChange={(event) => setSecret(event.target.value)}
          />
        </label>

        <p className="connection_hint">{t.connections.authKeyHint}</p>
        {error && <p className="connection_error">{error}</p>}

        <DialogActions>
          <Button type="button" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            className={classNames("connection_submit", busy && "disabled")}
            disabled={busy}
          >
            {t.connections.retry}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ConnectionAuthDialog;
