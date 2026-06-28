import Dialog from "@/shared/components/patterns/Dialog";
import IconButton from "@/shared/components/elements/IconButton";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { ESCAPE_HOTKEY } from "@/shared/keymap";
import {
  SIDEBAR_OPACITY_MIN,
  SIDEBAR_OPACITY_MAX,
  SIDEBAR_OPACITY_STEP,
} from "@/shared/constants";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SettingsDialog.css";

import { SETTINGS_TITLE_ID, ZOOM_OPTIONS } from "./constants";
import SettingsRow from "./SettingsRow";
import DateFormatRow from "./DateFormatRow";
import type { SettingsDialogProps } from "./types";

// App settings. A shell for now with a couple of real controls; add more rows under the
// relevant section as settings grow.
const SettingsDialog = ({ visible, onClose }: SettingsDialogProps) => {
  const {
    showHidden,
    toggleShowHidden,
    defaultZoom,
    setDefaultZoom,
    sidebarOpacity,
    setSidebarOpacity,
  } = useStateContext();

  useCloseOnEscape(visible, onClose);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="settings_modal"
      labelledBy={SETTINGS_TITLE_ID}
    >
      <div className="panel_header">
        <h4 id={SETTINGS_TITLE_ID}>{t.settings.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={onClose}
          tooltip={t.common.close}
          hotkey={ESCAPE_HOTKEY}
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

          <DateFormatRow />

          <SettingsRow
            label={t.settings.sidebarTransparency}
            hint={t.settings.sidebarTransparencyHint}
          >
            {/* UI is transparency (0 = solid, 1 = fully see-through); stored value is the inverse
                opacity, so convert both ways here. */}
            <span className="settings_range_control">
              <input
                type="range"
                className="settings_range"
                min={SIDEBAR_OPACITY_MIN}
                max={SIDEBAR_OPACITY_MAX}
                step={SIDEBAR_OPACITY_STEP}
                value={SIDEBAR_OPACITY_MAX - sidebarOpacity}
                onChange={(event) =>
                  setSidebarOpacity(
                    SIDEBAR_OPACITY_MAX - Number(event.target.value),
                  )
                }
              />
              <span className="settings_range_value">
                {t.settings.zoomPercent(
                  Math.round((SIDEBAR_OPACITY_MAX - sidebarOpacity) * 100),
                )}
              </span>
            </span>
          </SettingsRow>
        </section>
      </div>
    </Dialog>
  );
};

export default SettingsDialog;
