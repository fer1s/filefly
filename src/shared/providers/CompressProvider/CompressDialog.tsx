import { useEffect, useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import DialogActions from "@/shared/components/patterns/DialogActions";
import Button from "@/shared/components/elements/Button";
import TextInput from "@/shared/components/elements/TextInput";
import Slider from "@/shared/components/elements/Slider";
import PasswordInput from "@/shared/components/patterns/PasswordInput";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { t } from "@/lang";

import "@/styles/components/CompressDialog.css";

import type { CompressDialogProps } from "./types";

const TITLE_ID = "compress-dialog-title";
// Balanced default (zip levels run 0=fastest .. 9=smallest).
const DEFAULT_LEVEL = 6;

// Compress-options dialog: archive name + DEFLATE level + optional password (AES-256). Enter
// submits, Escape/backdrop cancels. (Split volumes are planned once 7z/rar land.)
const CompressDialog = ({
  visible,
  defaultName,
  ext,
  onSubmit,
  onClose,
}: CompressDialogProps) => {
  useCloseOnEscape(visible, onClose);

  const [name, setName] = useState(defaultName);
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [password, setPassword] = useState("");

  // Reset fields each time the dialog (re)opens for a new selection.
  useEffect(() => {
    if (visible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset fields on (re)open
      setName(defaultName);
      setLevel(DEFAULT_LEVEL);
      setPassword("");
    }
  }, [visible, defaultName]);

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    // Keep the name ending in the target extension (the backend picks the format from it).
    const suffix = `.${ext}`;
    const finalName = trimmed.toLowerCase().endsWith(suffix.toLowerCase())
      ? trimmed
      : `${trimmed}${suffix}`;
    onSubmit({ name: finalName, level, password: password || undefined });
  };

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="confirmation_modal"
      labelledBy={TITLE_ID}
    >
      <DialogHeader
        title={t.archive.compressTitle}
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
          <span>{t.archive.name}</span>
          <TextInput
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="compress_field">
          <span>
            {t.archive.level}: {level}
          </span>
          <Slider
            min={0}
            max={9}
            step={1}
            value={level}
            onChange={(event) => setLevel(Number(event.target.value))}
          />
          <span className="compress_level_hint">
            <span>{t.archive.levelFast}</span>
            <span>{t.archive.levelBest}</span>
          </span>
        </label>

        <label className="compress_field">
          <span>{t.archive.password}</span>
          <PasswordInput
            placeholder={t.archive.passwordOptional}
            value={password}
            // eslint-disable-next-line i18next/no-literal-string -- HTML autocomplete token
            autoComplete="new-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <DialogActions>
          <Button onClick={onClose}>{t.common.cancel}</Button>
          <Button type="submit" className="primary" disabled={!canSubmit}>
            {t.archive.compressButton}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CompressDialog;
