import { useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import Button, { BUTTON_VARIANT } from "@/shared/components/elements/Button";
import TextInput from "@/shared/components/elements/TextInput";
import Icon from "@/shared/components/elements/Icon";
import type { SmbShare } from "@/shared/services/api";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import { faFolder } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/ConnectionDialog.css";
import "@/styles/components/SmbDialog.css";

import {
  SMB_PROBE_STATE,
  SMB_SHARE_SEPARATOR_PATTERN,
  SMB_SHARES_STATE,
  SMB_TITLE_ID,
} from "./constants";
import type { SmbDialogProps, SmbProbeState, SmbSharesState } from "./types";
import { useConnections } from "../../providers/ConnectionsProvider";

// Add-a-Windows-share dialog (sidebar Network group → "+" → Windows share). Collects the host and
// share name; macOS owns authentication (its native prompt) when the location is opened, so no
// credentials are entered here. "Test connection" probes TCP 445 so the user learns the PC is
// reachable before saving. With `initial` it doubles as the edit/reconnect dialog: prefilled and
// framed as "update" (e.g. after a saved location's IP changed with the network).
const SmbDialog = ({ visible, initial, onSubmit, onClose }: SmbDialogProps) => {
  const { smbManager } = useConnections();

  const editing = !!initial;

  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [share, setShare] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [probe, setProbe] = useState<SmbProbeState>(SMB_PROBE_STATE.IDLE);
  const [shares, setShares] = useState<SmbShare[]>([]);
  const [sharesState, setSharesState] = useState<SmbSharesState>(
    SMB_SHARES_STATE.IDLE,
  );

  // (Re)seed the form each time it opens (React "adjust state when props change" pattern): from the
  // edited location, or blank for a new one.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setName(initial?.name ?? "");
      setHost(initial?.host ?? "");
      setShare(initial?.share ?? "");
      setBusy(false);
      setError(null);
      setProbe(SMB_PROBE_STATE.IDLE);
      setShares([]);
      setSharesState(SMB_SHARES_STATE.IDLE);
    }
  }

  // Ask macOS for the host's shares (works once it has Keychain credentials from a prior sign-in).
  // On failure we flip to ERROR so the UI shows the "sign in once / run Get-SmbShare" hint rather
  // than a dead error — the manual share field always stays available.
  const loadShares = async () => {
    if (host.trim() === "") {
      setError(t.smb.invalidHost);
      return;
    }
    setError(null);
    setSharesState(SMB_SHARES_STATE.LOADING);
    try {
      const found = await smbManager.shares(host.trim());
      setShares(found);
      setSharesState(SMB_SHARES_STATE.LOADED);
    } catch {
      setShares([]);
      setSharesState(SMB_SHARES_STATE.ERROR);
    }
  };

  const shareValid =
    share.trim() !== "" && !SMB_SHARE_SEPARATOR_PATTERN.test(share);
  const canSubmit = host.trim() !== "" && shareValid && !busy;

  // Probe TCP 445 without authenticating so the user sees whether the PC is reachable.
  const test = async () => {
    if (host.trim() === "") {
      setError(t.smb.invalidHost);
      return;
    }
    setError(null);
    setProbe(SMB_PROBE_STATE.TESTING);
    try {
      const result = await smbManager.diagnose(
        host.trim(),
        share.trim() || undefined,
      );
      setProbe(
        result.reachable
          ? SMB_PROBE_STATE.REACHABLE
          : SMB_PROBE_STATE.UNREACHABLE,
      );
    } catch (err) {
      setProbe(SMB_PROBE_STATE.UNREACHABLE);
      setError(t.smb.connectError(String(err)));
    }
  };

  const submit = async () => {
    if (host.trim() === "") {
      setError(t.smb.invalidHost);
      return;
    }
    if (!shareValid) {
      setError(t.smb.invalidShare);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(host.trim(), share.trim(), name.trim());
    } catch (err) {
      setBusy(false);
      setError(t.smb.connectError(String(err)));
    }
  };

  return (
    <Dialog
      visible={visible}
      title={editing ? t.smb.editTitle : t.smb.newTitle}
      onClose={onClose}
      className="connection_modal SmbDialog"
    >
      <DialogHeader
        title={editing ? t.smb.editTitle : t.smb.newTitle}
        titleId={SMB_TITLE_ID}
        onClose={onClose}
      />

      <form
        className="connection_body"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {editing && initial && (
          <p className="connection_hint">
            {t.smb.reconnectHint(initial.name, initial.host)}
          </p>
        )}

        <label className="connection_field">
          <span>{t.smb.fieldName}</span>
          <TextInput
            autoFocus={!editing}
            value={name}
            placeholder={t.smb.fieldNamePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="connection_field">
          <span>{t.smb.fieldHost}</span>
          <TextInput
            autoFocus={editing}
            value={host}
            placeholder={t.smb.fieldHostPlaceholder}
            onChange={(event) => {
              setHost(event.target.value);
              setProbe(SMB_PROBE_STATE.IDLE);
            }}
          />
        </label>

        <div className="connection_field">
          <div className="smb_shares_header">
            <span>{t.smb.sharesTitle}</span>
            <Button
              type="button"
              className="smb_shares_list_button"
              onClick={() => void loadShares()}
              disabled={
                host.trim() === "" || sharesState === SMB_SHARES_STATE.LOADING
              }
            >
              {sharesState === SMB_SHARES_STATE.LOADING
                ? t.smb.loadingShares
                : t.smb.listShares}
            </Button>
          </div>
          {sharesState === SMB_SHARES_STATE.LOADED && shares.length > 0 && (
            <>
              <p className="connection_hint">{t.smb.pickShareHint}</p>
              <ul className="smb_shares_list">
                {shares.map((entry) => (
                  <li key={entry.name}>
                    <Button
                      type="button"
                      className={classNames(
                        "smb_share_option",
                        share.trim() === entry.name && "selected",
                        entry.admin && "admin",
                      )}
                      onClick={() => {
                        setShare(entry.name);
                        setProbe(SMB_PROBE_STATE.IDLE);
                      }}
                    >
                      <Icon icon={faFolder} />
                      <span className="smb_share_name">{entry.name}</span>
                      {entry.admin && (
                        <span className="smb_share_admin">
                          {t.smb.adminShareNote}
                        </span>
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {sharesState === SMB_SHARES_STATE.ERROR && (
            <p className="connection_hint">{t.smb.sharesUnavailable}</p>
          )}
        </div>

        <label className="connection_field">
          <span>{t.smb.fieldShare}</span>
          <TextInput
            value={share}
            placeholder={t.smb.fieldSharePlaceholder}
            onChange={(event) => {
              setShare(event.target.value);
              setProbe(SMB_PROBE_STATE.IDLE);
            }}
          />
        </label>

        <div className="connection_row">
          <Button
            type="button"
            onClick={() => void test()}
            disabled={host.trim() === "" || probe === SMB_PROBE_STATE.TESTING}
          >
            {probe === SMB_PROBE_STATE.TESTING ? t.smb.testing : t.smb.test}
          </Button>
          {probe === SMB_PROBE_STATE.REACHABLE && (
            <p className="connection_hint smb_reachable">{t.smb.reachable}</p>
          )}
          {probe === SMB_PROBE_STATE.UNREACHABLE && (
            <p className="connection_error">{t.smb.unreachable}</p>
          )}
        </div>

        <p className="connection_hint">{t.smb.hint}</p>
        {error && <p className="connection_error">{error}</p>}

        <DialogActions>
          <Button type="button" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button
            type="submit"
            variant={BUTTON_VARIANT.PRIMARY}
            disabled={!canSubmit}
          >
            {editing ? t.smb.save : t.smb.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SmbDialog;
