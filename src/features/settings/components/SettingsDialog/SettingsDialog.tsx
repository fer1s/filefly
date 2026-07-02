import { useMemo, useState } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
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
import { matchesQuery } from "./utils";
import SettingsNav from "./SettingsNav";
import SettingItem from "./SettingItem";
import type { SettingsDialogProps } from "./types";

// VS Code-style settings: a declarative schema (SETTINGS_SCHEMA) rendered generically. A search
// box filters across every section; a left rail navigates sections when not searching. Each row
// gets its control, a modified indicator, and reset-to-default — all driven by the descriptor.
const SettingsDialog = ({ visible, onClose }: SettingsDialogProps) => {
  const { settings, update, defaults } = useSettings();
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
        <input
          type="search"
          className="settings_search"
          value={rawQuery}
          onChange={(event) => setRawQuery(event.target.value)}
          placeholder={t.settings.search}
          aria-label={t.settings.search}
          spellCheck={false}
        />
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
                {group.items.map((descriptor) => (
                  <SettingItem
                    key={descriptor.key}
                    descriptor={descriptor}
                    settings={settings}
                    update={update}
                    defaults={defaults}
                  />
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
