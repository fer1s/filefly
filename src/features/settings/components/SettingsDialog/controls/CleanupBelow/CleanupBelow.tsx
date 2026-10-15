import { useState, type KeyboardEvent } from "react";
import { faPlus, faRotateRight } from "@fortawesome/free-solid-svg-icons";

import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import TextInput from "@/shared/components/elements/TextInput";
import { CLEANUP_MODE } from "@/shared/constants";
import { formatBytes } from "@/shared/utils";
import { t } from "@/lang";

import { useSettings } from "../../../../providers/SettingsProvider";

import CleanupChip from "./CleanupChip";
import { useCleanupTargets } from "./useCleanupTargets";

// Full-width extra for the Cleanup row, laid out like the size-ignore editor: a path input (Enter
// or the + button registers it) and a wrapping row of chips — one per watched folder, each carrying
// its recursive size, a mode toggle, a cleanup broom and a remove ×. The path is typed or pasted
// (a leading ~ works); the backend canonicalizes and validates it. Registered folders live in
// cleanup.toml, independent of settings.toml, so adding one is not a settings change and needs no
// reset affordance.
//
// Every cleanup moves the folder (or its children) to the system Trash, never a permanent delete —
// which also means the space is only fully reclaimed once the Trash is emptied. Sizes are summed by
// a recursive walk in Rust off the UI thread, so the panel shows a measuring hint until it resolves
// and re-measures after each cleanup. Takes no props (the schema renders it with
// CustomControlProps, which it ignores).
const CleanupBelow = () => {
  const { manager } = useSettings();
  const { targets, total, busyPath, refresh, add, remove, setMode, clean } =
    useCleanupTargets();
  const [draft, setDraft] = useState("");

  const locked = busyPath !== null;
  const hasTargets = targets !== null && targets.length > 0;

  const submit = async () => {
    const value = draft.trim();
    if (!value) return;
    // Only clear the input on success; a rejected path stays put for the user to fix.
    if (await add(value)) setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <div className="settings_cleanup">
      <div className="settings_ignores_input">
        <TextInput
          className="settings_input"
          value={draft}
          placeholder={t.settings.cleanupPlaceholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={locked}
          spellCheck={false}
          // eslint-disable-next-line i18next/no-literal-string -- HTML input attribute value
          autoCapitalize="off"
          // eslint-disable-next-line i18next/no-literal-string -- HTML input attribute value
          autoCorrect="off"
        />
        <IconButton
          icon={faPlus}
          variant={ICON_BUTTON_VARIANT.BOXED}
          size={ICON_BUTTON_SIZE.LG}
          onClick={() => void submit()}
          disabled={locked || !draft.trim()}
          tooltip={t.settings.cleanupAdd}
          aria-label={t.settings.cleanupAdd}
        />
      </div>

      {targets === null && (
        <span className="settings_row_hint">{t.settings.storageLoading}</span>
      )}
      {targets !== null && targets.length === 0 && (
        <span className="settings_row_hint">{t.settings.cleanupEmpty}</span>
      )}

      {hasTargets && (
        <div className="settings_cleanup_chips">
          {targets.map((target) => (
            <CleanupChip
              key={target.path}
              target={target}
              busy={busyPath === target.path}
              locked={locked}
              onOpen={(path) => void manager.openPath(path)}
              onModeToggle={() =>
                void setMode(
                  target.path,
                  target.mode === CLEANUP_MODE.CONTENTS
                    ? CLEANUP_MODE.FOLDER
                    : CLEANUP_MODE.CONTENTS,
                )
              }
              onClean={() => void clean(target)}
              onRemove={() => void remove(target.path)}
            />
          ))}
        </div>
      )}

      {hasTargets && (
        <div className="settings_cleanup_footer">
          <span className="settings_row_hint">
            {t.settings.cleanupTrashHint}
          </span>
          <span className="settings_cleanup_footer_meta">
            <span className="settings_range_value">
              {t.settings.cleanupTotalShort(formatBytes(total))}
            </span>
            <IconButton
              icon={faRotateRight}
              size={ICON_BUTTON_SIZE.SM}
              variant={ICON_BUTTON_VARIANT.GHOST}
              disabled={locked}
              tooltip={t.settings.cleanupRefresh}
              aria-label={t.settings.cleanupRefresh}
              onClick={() => void refresh()}
            />
          </span>
        </div>
      )}
    </div>
  );
};

export default CleanupBelow;
