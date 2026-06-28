import Dialog from "@/shared/components/patterns/Dialog";
import IconButton from "@/shared/components/elements/IconButton";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SettingsDialog.css";

import { SETTINGS_TITLE_ID, ZOOM_OPTIONS, CLOSE_HOTKEY } from "./constants";
import SettingsRow from "./SettingsRow";
import type { SettingsDialogProps } from "./types";

// App settings. A shell for now with a couple of real controls; add more rows under the
// relevant section as settings grow.
const SettingsDialog = ({ visible, onClose }: SettingsDialogProps) => {
  const { showHidden, toggleShowHidden, defaultZoom, setDefaultZoom } =
    useStateContext();

  useCloseOnEscape(visible, onClose);

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

          <SettingsRow
            label={t.settings.showHidden}
            hint={t.settings.showHiddenHint}
          >
            <input
              type="checkbox"
              className="settings_switch"
              checked={showHidden}
              onChange={toggleShowHidden}
            />
          </SettingsRow>

          <SettingsRow
            label={t.settings.defaultZoom}
            hint={t.settings.defaultZoomHint}
          >
            <select
              className="settings_select"
              value={defaultZoom}
              onChange={(event) => setDefaultZoom(Number(event.target.value))}
            >
              {ZOOM_OPTIONS.map((zoom) => (
                <option key={zoom} value={zoom}>
                  {t.settings.zoomPercent(Math.round(zoom * 100))}
                </option>
              ))}
            </select>
          </SettingsRow>
        </section>
      </div>
    </Dialog>
  );
};

export default SettingsDialog;
