import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import Switcher from "@/shared/components/elements/Switcher";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import {
  SIDEBAR_OPACITY_MIN,
  SIDEBAR_OPACITY_MAX,
  SIDEBAR_OPACITY_STEP,
  DRAG_DROP_ACTION,
  type DragDropAction,
} from "@/shared/constants";
import { t } from "@/lang";

import "@/styles/components/SettingsDialog.css";

import { SETTINGS_TITLE_ID, ZOOM_OPTIONS } from "./constants";
import SettingsRow from "./SettingsRow";
import DateFormatRow from "./DateFormatRow";
import StartupRow from "./StartupRow";
import type { SettingsDialogProps } from "./types";

// App settings. A shell for now with a couple of real controls; add more rows under the
// relevant section as settings grow.
const SettingsDialog = ({ visible, onClose }: SettingsDialogProps) => {
  const {
    showHidden,
    toggleShowHidden,
    hideSystemRecents,
    toggleHideSystemRecents,
    showToasts,
    toggleShowToasts,
    defaultZoom,
    setDefaultZoom,
    sidebarOpacity,
    setSidebarOpacity,
    dragDropAction,
    setDragDropAction,
    confirmDragDrop,
    toggleConfirmDragDrop,
    clickableToasts,
    toggleClickableToasts,
    dragToExternalApps,
    toggleDragToExternalApps,
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

          <StartupRow />

          <SettingsRow
            label={t.settings.showHidden}
            hint={t.settings.showHiddenHint}
          >
            <Switcher checked={showHidden} onChange={toggleShowHidden} />
          </SettingsRow>

          <SettingsRow
            label={t.settings.hideSystemRecents}
            hint={t.settings.hideSystemRecentsHint}
          >
            <Switcher
              checked={hideSystemRecents}
              onChange={toggleHideSystemRecents}
            />
          </SettingsRow>

          <SettingsRow
            label={t.settings.showToasts}
            hint={t.settings.showToastsHint}
          >
            <Switcher checked={showToasts} onChange={toggleShowToasts} />
          </SettingsRow>

          <SettingsRow
            label={t.settings.dragDrop}
            hint={t.settings.dragDropHint}
          >
            <select
              className="settings_select"
              value={dragDropAction}
              onChange={(event) =>
                setDragDropAction(event.target.value as DragDropAction)
              }
            >
              <option value={DRAG_DROP_ACTION.MOVE}>
                {t.settings.dragDropMove}
              </option>
              <option value={DRAG_DROP_ACTION.COPY}>
                {t.settings.dragDropCopy}
              </option>
            </select>
          </SettingsRow>

          <SettingsRow
            label={t.settings.confirmDragDrop}
            hint={t.settings.confirmDragDropHint}
          >
            <Switcher
              checked={confirmDragDrop}
              onChange={toggleConfirmDragDrop}
            />
          </SettingsRow>

          <SettingsRow
            label={t.settings.clickableToasts}
            hint={t.settings.clickableToastsHint}
          >
            <Switcher
              checked={clickableToasts}
              onChange={toggleClickableToasts}
            />
          </SettingsRow>

          <SettingsRow
            label={t.settings.dragToExternalApps}
            hint={t.settings.dragToExternalAppsHint}
          >
            <Switcher
              checked={dragToExternalApps}
              onChange={toggleDragToExternalApps}
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
