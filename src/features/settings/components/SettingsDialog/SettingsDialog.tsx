import { useCallback, useMemo, useState } from "react";
import { faFileImport, faFileExport } from "@fortawesome/free-solid-svg-icons";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import IconButton, {
  ICON_BUTTON_VARIANT,
  ICON_BUTTON_SIZE,
} from "@/shared/components/elements/IconButton";
import TextInput from "@/shared/components/elements/TextInput";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { useStateContext } from "@/shared/providers/StateProvider";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { useFilePicker } from "@/shared/providers/FilePickerProvider";
import { useFolderPicker } from "@/shared/providers/FolderPickerProvider";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import "@/styles/components/SettingsDialog.css";

import { useSettings } from "../../providers/SettingsProvider";
import {
  SETTINGS_SCHEMA,
  SETTINGS_SECTIONS,
  SETTINGS_SECTION,
  type SettingsSectionId,
} from "../../schema";
import { SETTINGS_TITLE_ID } from "./constants";
import { matchesQuery, groupBySubsection } from "./utils";
import SettingsNav from "./SettingsNav";
import SettingItem from "./SettingItem";
import type { SettingsDialogProps } from "./types";

// VS Code-style settings: a declarative schema (SETTINGS_SCHEMA) rendered generically. A search
// box filters across every section; a left rail navigates sections when not searching. Each row
// gets its control, a modified indicator, and reset-to-default — all driven by the descriptor.
const SettingsDialog = ({ visible, onClose }: SettingsDialogProps) => {
  const { settings, update, defaults, manager } = useSettings();
  const [rawQuery, setRawQuery] = useState("");
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(
    SETTINGS_SECTION.GENERAL,
  );

  useCloseOnEscape(visible, onClose);

  const query = rawQuery.trim().toLowerCase();
  const searching = query !== "";

  // While searching, show every matching setting; otherwise the selected section's settings.
  const shownDescriptors = useMemo(
    () =>
      searching
        ? SETTINGS_SCHEMA.filter((d) => matchesQuery(d, query))
        : SETTINGS_SCHEMA.filter((d) => d.section === activeSection),
    [searching, query, activeSection],
  );

  // Group the visible settings by section, in section order, dropping empty groups.
  const groups = useMemo(
    () =>
      SETTINGS_SECTIONS.map((section) => ({
        section,
        items: shownDescriptors.filter((d) => d.section === section.id),
      })).filter((group) => group.items.length > 0),
    [shownDescriptors],
  );

  // Per-section match counts for the nav (totals when not searching).
  const counts = useMemo(() => {
    const base = searching
      ? SETTINGS_SCHEMA.filter((d) => matchesQuery(d, query))
      : SETTINGS_SCHEMA;
    return SETTINGS_SECTIONS.reduce(
      (acc, section) => {
        acc[section.id] = base.filter((d) => d.section === section.id).length;
        return acc;
      },
      {} as Record<SettingsSectionId, number>,
    );
  }, [searching, query]);

  const selectSection = (id: SettingsSectionId) => {
    setRawQuery("");
    setActiveSection(id);
  };

  const { pickFile } = useFilePicker();
  const { pickFolder } = useFolderPicker();
  const { setPath } = useStateContext();
  const { confirm } = useConfirm();

  // Import: pick a .toml, parse it (backend fills missing keys from defaults), then apply through
  // the normal patch writer — which persists it to settings.toml like any other change.
  const handleImport = useCallback(async () => {
    const file = await pickFile({ extensions: ["toml"] });
    if (!file) return;
    try {
      update(await manager.importSettings(file));
      notify(t.settings.imported, TOAST_TYPE.SUCCESS);
    } catch (err) {
      notify(t.settings.importError(String(err)), TOAST_TYPE.ERROR);
    }
  }, [pickFile, update, manager]);

  // Export: pick a destination folder, write the current settings there as settings.toml.
  // With "confirm before overwriting" on, a pre-existing settings.toml prompts a confirmation
  // (and is only replaced on accept); with it off (default), a unique filename is used instead so
  // nothing is overwritten silently. Clicking the success toast opens the destination folder in
  // the browser behind the still-open dialog (navigation happens on the active tab underneath).
  const handleExport = useCallback(async () => {
    const dir = await pickFolder();
    if (!dir) return;
    const reveal = (path: string) =>
      notify(t.settings.exported(path), TOAST_TYPE.SUCCESS, () => setPath(dir));
    try {
      if (settings.confirmExportOverwrite) {
        const first = await manager.exportSettings(dir, settings, false, false);
        if (first.existed) {
          const ok = await confirm({
            title: t.settings.exportSettings,
            message: t.settings.exportExists,
            confirmLabel: t.settings.overwrite,
            destructive: true,
          });
          if (!ok) return;
          const written = await manager.exportSettings(
            dir,
            settings,
            false,
            true,
          );
          if (written.path) reveal(written.path);
        } else if (first.path) {
          reveal(first.path);
        }
      } else {
        const written = await manager.exportSettings(
          dir,
          settings,
          true,
          false,
        );
        if (written.path) reveal(written.path);
      }
    } catch (err) {
      notify(t.settings.exportError(String(err)), TOAST_TYPE.ERROR);
    }
  }, [pickFolder, settings, setPath, confirm, manager]);

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

      <div className="settings_toolbar">
        <TextInput
          type="search"
          className="settings_search"
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          placeholder={t.settings.search}
          aria-label={t.settings.search}
          spellCheck={false}
        />
        <div className="settings_toolbar_actions">
          <IconButton
            icon={faFileImport}
            onClick={handleImport}
            variant={ICON_BUTTON_VARIANT.BOXED}
            size={ICON_BUTTON_SIZE.LG}
            tooltip={t.settings.importSettings}
            aria-label={t.settings.importSettings}
          />
          <IconButton
            icon={faFileExport}
            onClick={handleExport}
            variant={ICON_BUTTON_VARIANT.BOXED}
            size={ICON_BUTTON_SIZE.LG}
            tooltip={t.settings.exportSettings}
            aria-label={t.settings.exportSettings}
          />
        </div>
      </div>

      <div className="settings_layout">
        <SettingsNav
          active={activeSection}
          counts={counts}
          onSelect={selectSection}
        />

        <div className="settings_panel">
          {groups.length === 0 ? (
            <p className="settings_empty">{t.settings.searchEmpty(rawQuery)}</p>
          ) : (
            groups.map((group) => (
              <section key={group.section.id} className="settings_section">
                <h5 className="settings_section_title">
                  {group.section.label()}
                </h5>
                {groupBySubsection(group.items).map((sub) => (
                  <div key={sub.title ?? "_"} className="settings_subsection">
                    {sub.title && (
                      <h6 className="settings_subsection_title">{sub.title}</h6>
                    )}
                    {sub.items.map((descriptor) => (
                      <SettingItem
                        key={descriptor.key}
                        descriptor={descriptor}
                        settings={settings}
                        update={update}
                        defaults={defaults}
                      />
                    ))}
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default SettingsDialog;
