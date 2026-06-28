import { useEffect } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import IconButton from "@/shared/components/elements/IconButton";
import { useStateContext } from "@/shared/providers/StateProvider";
import { KEY } from "@/shared/constants";
import { formatBinding } from "@/shared/keymap";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SettingsDialog.css";

import { SETTINGS_TITLE_ID } from "./constants";
import type { SettingsDialogProps } from "./types";

// Universal-cancel close, like the other dialogs.
const CLOSE_HOTKEY = formatBinding({ keys: [KEY.ESCAPE] });

// App settings. A shell for now with a single real toggle (show hidden files); add more rows
// under the relevant section as settings grow.
const SettingsDialog = ({ visible, onClose }: SettingsDialogProps) => {
  const { showHidden, toggleShowHidden } = useStateContext();

  useEffect(() => {
    if (!visible) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === KEY.ESCAPE) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="settings_modal"
      labelledBy={SETTINGS_TITLE_ID}
    >
      <div className="settings_header">
        <h4 id={SETTINGS_TITLE_ID}>{t.settings.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={onClose}
          tooltip={t.common.close}
          hotkey={CLOSE_HOTKEY}
          aria-label={t.common.close}
        />
      </div>

      <div className="settings_body">
        <section className="settings_section">
          <h5 className="settings_section_title">{t.settings.general}</h5>

          <label className="settings_row">
            <span className="settings_row_text">
              <span className="settings_row_label">
                {t.settings.showHidden}
              </span>
              <span className="settings_row_hint">
                {t.settings.showHiddenHint}
              </span>
            </span>
            <input
              type="checkbox"
              className="settings_switch"
              checked={showHidden}
              onChange={toggleShowHidden}
            />
          </label>
        </section>
      </div>
    </Dialog>
  );
};

export default SettingsDialog;
