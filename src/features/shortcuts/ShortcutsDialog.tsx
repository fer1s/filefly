import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import { useKeymap, useShortcutHelp } from "@/shared/keymap";
import { t } from "@/lang";

import "@/styles/components/ShortcutsDialog.css";

import { SHORTCUTS_TITLE_ID, SHORTCUT_SECTIONS } from "./constants";
import { formatRowKeys } from "./utils";

// Read-only cheat-sheet of every keyboard shortcut, opened with the help_shortcuts binding
// (Cmd/Ctrl+/). The keys shown come from the live keymap, so they stay in sync with rebindings.
const ShortcutsDialog = () => {
  const { active, exit } = useShortcutHelp();
  const { keymap } = useKeymap();

  return (
    <Dialog
      visible={active}
      onClose={exit}
      className="shortcuts_modal"
      labelledBy={SHORTCUTS_TITLE_ID}
    >
      <DialogHeader
        title={t.shortcuts.title}
        titleId={SHORTCUTS_TITLE_ID}
        onClose={exit}
      />

      <div className="shortcuts_body">
        {SHORTCUT_SECTIONS.map((section) => (
          <section className="shortcuts_section" key={section.title()}>
            <h5 className="shortcuts_section_title">{section.title()}</h5>
            <ul className="shortcuts_list">
              {section.rows.map((row) => {
                const keys = formatRowKeys(row, keymap);
                return (
                  <li className="shortcuts_row" key={row.label()}>
                    <span className="shortcuts_label">{row.label()}</span>
                    {keys && <kbd className="shortcuts_keys">{keys}</kbd>}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Dialog>
  );
};

export default ShortcutsDialog;
