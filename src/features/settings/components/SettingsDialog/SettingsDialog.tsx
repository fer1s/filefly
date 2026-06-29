import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import {
  SIDEBAR_OPACITY_MIN,
  SIDEBAR_OPACITY_MAX,
  SIDEBAR_OPACITY_STEP,
} from "@/shared/constants";
import { t } from "@/lang";

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
    hideSystemRecents,
    toggleHideSystemRecents,
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
      <DialogHeader
        title={t.settings.title}
        titleId={SETTINGS_TITLE_ID}
        onClose={onClose}
      />

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
            label={t.settings.hideSystemRecents}
            hint={t.settings.hideSystemRecentsHint}
          >
            <input
              type="checkbox"
              className="settings_switch"
              checked={hideSystemRecents}
              onChange={toggleHideSystemRecents}
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
