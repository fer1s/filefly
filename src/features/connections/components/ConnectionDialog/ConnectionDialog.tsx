import { useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import Button from "@/shared/components/elements/Button";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import type { NewConnection } from "@/shared/services/api";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/ConnectionDialog.css";

import { AUTH_KIND, SSH_DEFAULT_PORT, type AuthKind } from "../../constants";
import { ConnectionsManager } from "../../managers/ConnectionsManager";
import { CONNECTION_TITLE_ID } from "./constants";
import type { ConnectionDialogProps } from "./types";

const manager = new ConnectionsManager();

// Create-connection form (SSH_PLAN.md phase 2). Non-secret fields go to connections.toml; the
// password / key passphrase go to the OS keychain (handled by the backend). The auth selector only
// shapes which secret fields show — the backend always tries agent → key → password in order.
const ConnectionDialog = ({
  visible,
  initial,
  onSubmit,
  onClose,
}: ConnectionDialogProps) => {
  useCloseOnEscape(visible, onClose);

  const editing = !!initial;

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(String(SSH_DEFAULT_PORT));
  const [user, setUser] = useState("");
  const [authKind, setAuthKind] = useState<AuthKind>(AUTH_KIND.AGENT);
  const [keyPath, setKeyPath] = useState("");
  const [keyPassphrase, setKeyPassphrase] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // (Re)seed the form each time it opens: from the edited connection, or blank for a new one.
  // Secrets are never prefilled (they're in the keychain); the auth selector defaults to key when
  // a key path is set, else agent — a best guess, since we don't persist the auth kind.
  // Done during render with a prev-guard (the React "adjust state when props change" pattern)
  // instead of an effect, so the seed lands in the same render pass with no cascading re-render.
  const seed = visible ? initial : null;
  const [prevSeed, setPrevSeed] = useState<typeof seed | false>(false);
  if (seed !== prevSeed) {
    setPrevSeed(seed);
    if (visible) {
      setName(initial?.name ?? "");
      setHost(initial?.host ?? "");
      setPort(String(initial?.port ?? SSH_DEFAULT_PORT));
      setUser(initial?.user ?? "");
      setAuthKind(AUTH_KIND.AGENT);
      setKeyPath("");
      setKeyPassphrase("");
      setPassword("");
      setBusy(false);
      setError(null);
    }
  }

  const canSubmit =
    name.trim() !== "" && host.trim() !== "" && user.trim() !== "" && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    const parsedPort = Number(port);
    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      setError(t.connections.invalidPort);
      return;
    }
    const connection: NewConnection = {
      // Editing keeps the original id (so its sftp://<id>/ path stays stable even if renamed); a
      // new connection derives its id from the name.
      id: initial ? initial.id : manager.idFor(name),
      name: name.trim(),
      host: host.trim(),
      port: parsedPort,
      user: user.trim(),
      keyPath:
        authKind === AUTH_KIND.KEY && keyPath.trim()
          ? keyPath.trim()
          : undefined,
      keyPassphrase:
        authKind === AUTH_KIND.KEY && keyPassphrase ? keyPassphrase : undefined,
      password:
        authKind === AUTH_KIND.PASSWORD && password ? password : undefined,
    };
    setBusy(true);
    setError(null);
    try {
      await onSubmit(connection);
    } catch (err) {
      setBusy(false);
      setError(t.connections.addError(String(err)));
    }
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="connection_modal"
      labelledBy={CONNECTION_TITLE_ID}
    >
      <DialogHeader
        title={editing ? t.connections.editTitle : t.connections.newTitle}
        titleId={CONNECTION_TITLE_ID}
        onClose={onClose}
      />

      <form
        className="connection_body"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="connection_field">
          <span>{t.connections.fieldName}</span>
          <input
            autoFocus
            value={name}
            placeholder={t.connections.fieldNamePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="connection_field">
          <span>{t.connections.fieldHost}</span>
          <input
            value={host}
            placeholder={t.connections.fieldHostPlaceholder}
            onChange={(event) => setHost(event.target.value)}
          />
        </label>

        <div className="connection_row">
          <label className="connection_field connection_field_user">
            <span>{t.connections.fieldUser}</span>
            <input
              value={user}
              placeholder={t.connections.fieldUserPlaceholder}
              onChange={(event) => setUser(event.target.value)}
            />
          </label>
          <label className="connection_field connection_field_port">
            <span>{t.connections.fieldPort}</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={port}
              onChange={(event) => setPort(event.target.value)}
            />
          </label>
        </div>

        <label className="connection_field">
          <span>{t.connections.fieldAuth}</span>
          <select
            className="connection_select"
            value={authKind}
            onChange={(event) => setAuthKind(event.target.value as AuthKind)}
          >
            <option value={AUTH_KIND.AGENT}>{t.connections.authAgent}</option>
            <option value={AUTH_KIND.KEY}>{t.connections.authKey}</option>
            <option value={AUTH_KIND.PASSWORD}>
              {t.connections.authPassword}
            </option>
          </select>
        </label>

        {authKind === AUTH_KIND.KEY && (
          <>
            <label className="connection_field">
              <span>{t.connections.fieldKeyPath}</span>
              <input
                value={keyPath}
                placeholder={t.connections.fieldKeyPathPlaceholder}
                onChange={(event) => setKeyPath(event.target.value)}
              />
            </label>
            <label className="connection_field">
              <span>{t.connections.fieldKeyPassphrase}</span>
              <input
                type="password"
                value={keyPassphrase}
                placeholder={t.connections.optional}
                onChange={(event) => setKeyPassphrase(event.target.value)}
              />
            </label>
          </>
        )}

        {authKind === AUTH_KIND.PASSWORD && (
          <label className="connection_field">
            <span>{t.connections.fieldPassword}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        )}

        <p className="connection_hint">{t.connections.authHint}</p>
        {error && <p className="connection_error">{error}</p>}

        <DialogActions>
          <Button type="button" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            className={classNames(
              "connection_submit",
              !canSubmit && "disabled",
            )}
            disabled={!canSubmit}
          >
            {editing ? t.connections.save : t.connections.create}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ConnectionDialog;
