import { useState, type FormEvent } from "react";
import {
  faArrowDown,
  faArrowUp,
  faFileExport,
  faFileImport,
  faPen,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";

import Button, { BUTTON_VARIANT } from "@/shared/components/elements/Button";
import Switcher from "@/shared/components/elements/Switcher";
import Icon from "@/shared/components/elements/Icon";
import IconButton, {
  ICON_BUTTON_SIZE,
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import Select from "@/shared/components/elements/Select";
import TextArea from "@/shared/components/elements/TextArea";
import TextInput from "@/shared/components/elements/TextInput";
import {
  CUSTOM_ACTION_ICON,
  CUSTOM_ACTION_TARGET,
  type CustomActionIcon,
  type CustomActionTarget,
} from "@/shared/constants";
import { customActionIcon } from "@/shared/contextActions";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { t } from "@/lang";

import {
  CUSTOM_ACTION_ARGUMENT_ROWS,
  CUSTOM_ACTION_ICON_OPTIONS,
  CUSTOM_ACTION_TARGET_OPTIONS,
} from "./constants";
import type { ContextActionDraft } from "./types";
import {
  newContextActionDraft,
  toContextActionDraft,
  toCustomContextAction,
} from "./utils";
import { useContextActions } from "./useContextActions";

const ContextActionsBelow = () => {
  const { actions, saving, save, exportActions, importActions } =
    useContextActions();
  const { confirm } = useConfirm();
  const [draft, setDraft] = useState<ContextActionDraft | null>(null);

  const updateDraft = (patch: Partial<ContextActionDraft>) =>
    setDraft((current) => (current ? { ...current, ...patch } : current));

  const toggleTarget = (target: CustomActionTarget) => {
    if (!draft) return;
    updateDraft({
      targets: draft.targets.includes(target)
        ? draft.targets.filter((candidate) => candidate !== target)
        : [...draft.targets, target],
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft || !actions) return;
    const nextAction = toCustomContextAction(draft);
    if (
      !nextAction.label ||
      !nextAction.command ||
      nextAction.targets.length === 0
    )
      return;
    const exists = actions.some((action) => action.id === nextAction.id);
    const next = exists
      ? actions.map((action) =>
          action.id === nextAction.id ? nextAction : action,
        )
      : [...actions, nextAction];
    if (await save(next)) setDraft(null);
  };

  const remove = async (id: string, label: string) => {
    if (!actions) return;
    const accepted = await confirm({
      title: t.settings.contextActionsDeleteTitle,
      message: t.settings.contextActionsDeleteMessage(label),
      confirmLabel: t.settings.contextActionsDelete,
      destructive: true,
    });
    if (accepted) void save(actions.filter((action) => action.id !== id));
  };

  const move = (index: number, offset: number) => {
    if (!actions) return;
    const destination = index + offset;
    if (destination < 0 || destination >= actions.length) return;
    const next = [...actions];
    const [action] = next.splice(index, 1);
    next.splice(destination, 0, action);
    void save(next);
  };

  const targetLabel = (target: CustomActionTarget) =>
    target === CUSTOM_ACTION_TARGET.DIRECTORY
      ? t.settings.contextActionsTargetDirectory
      : target === CUSTOM_ACTION_TARGET.FOLDER
        ? t.settings.contextActionsTargetFolder
        : t.settings.contextActionsTargetFile;

  const iconLabel = (icon: CustomActionIcon) =>
    icon === CUSTOM_ACTION_ICON.CODE
      ? t.settings.contextActionsIconCode
      : icon === CUSTOM_ACTION_ICON.TERMINAL
        ? t.settings.contextActionsIconTerminal
        : icon === CUSTOM_ACTION_ICON.APP
          ? t.settings.contextActionsIconApp
          : icon === CUSTOM_ACTION_ICON.PLAY
            ? t.settings.contextActionsIconPlay
            : icon === CUSTOM_ACTION_ICON.GEAR
              ? t.settings.contextActionsIconGear
              : icon === CUSTOM_ACTION_ICON.FILE
                ? t.settings.contextActionsIconFile
                : icon === CUSTOM_ACTION_ICON.FOLDER
                  ? t.settings.contextActionsIconFolder
                  : t.settings.contextActionsIconBolt;

  return (
    <div className="settings_context_actions">
      <div className="settings_context_actions_header">
        <span className="settings_row_hint">
          {t.settings.contextActionsPlaceholders}
        </span>
        <span className="settings_context_actions_header_actions">
          <IconButton
            icon={faFileImport}
            variant={ICON_BUTTON_VARIANT.BOXED}
            disabled={saving || actions === null}
            tooltip={t.settings.contextActionsImport}
            aria-label={t.settings.contextActionsImport}
            onClick={() => void importActions()}
          />
          <IconButton
            icon={faFileExport}
            variant={ICON_BUTTON_VARIANT.BOXED}
            disabled={saving || actions === null}
            tooltip={t.settings.contextActionsExport}
            aria-label={t.settings.contextActionsExport}
            onClick={() => void exportActions()}
          />
          <IconButton
            icon={faPlus}
            variant={ICON_BUTTON_VARIANT.BOXED}
            disabled={saving || actions === null || draft !== null}
            tooltip={t.settings.contextActionsAdd}
            aria-label={t.settings.contextActionsAdd}
            onClick={() => setDraft(newContextActionDraft())}
          />
        </span>
      </div>

      {actions === null && (
        <span className="settings_row_hint">
          {t.settings.contextActionsLoading}
        </span>
      )}
      {actions?.length === 0 && !draft && (
        <span className="settings_row_hint">
          {t.settings.contextActionsEmpty}
        </span>
      )}

      {actions?.map((action, index) => (
        <div className="settings_context_action" key={action.id}>
          <Icon icon={customActionIcon(action.icon)} />
          <span className="settings_context_action_text">
            <span className="settings_row_label">{action.label}</span>
            <span className="settings_row_hint">
              {t.settings.contextActionsSummary(
                action.targets.map(targetLabel).join(", "),
                action.extensions
                  .map((extension) => `.${extension}`)
                  .join(", "),
              )}
            </span>
            <span className="settings_context_action_command">
              {action.command}
            </span>
          </span>
          <Switcher
            checked={action.enabled}
            disabled={saving}
            aria-label={t.settings.contextActionsEnabled}
            title={t.settings.contextActionsEnabled}
            onChange={() =>
              void save(
                actions.map((candidate) =>
                  candidate.id === action.id
                    ? { ...candidate, enabled: !candidate.enabled }
                    : candidate,
                ),
              )
            }
          />
          <span className="settings_context_action_buttons">
            <IconButton
              icon={faArrowUp}
              size={ICON_BUTTON_SIZE.SM}
              disabled={saving || index === 0}
              tooltip={t.settings.contextActionsMoveUp}
              onClick={() => move(index, -1)}
            />
            <IconButton
              icon={faArrowDown}
              size={ICON_BUTTON_SIZE.SM}
              disabled={saving || index === actions.length - 1}
              tooltip={t.settings.contextActionsMoveDown}
              onClick={() => move(index, 1)}
            />
            <IconButton
              icon={faPen}
              size={ICON_BUTTON_SIZE.SM}
              disabled={saving || draft !== null}
              tooltip={t.settings.contextActionsEdit}
              onClick={() => setDraft(toContextActionDraft(action))}
            />
            <IconButton
              icon={faTrash}
              size={ICON_BUTTON_SIZE.SM}
              variant={ICON_BUTTON_VARIANT.DANGER}
              disabled={saving}
              tooltip={t.settings.contextActionsDelete}
              onClick={() => void remove(action.id, action.label)}
            />
          </span>
        </div>
      ))}

      {draft && (
        <form className="settings_context_action_form" onSubmit={submit}>
          <label>
            <span>{t.settings.contextActionsName}</span>
            <TextInput
              value={draft.label}
              onChange={(event) => updateDraft({ label: event.target.value })}
              placeholder={t.settings.contextActionsNamePlaceholder}
              autoFocus
            />
          </label>
          <label>
            <span>{t.settings.contextActionsIcon}</span>
            <span className="settings_context_action_icon_select">
              <Icon icon={customActionIcon(draft.icon)} />
              <Select
                value={draft.icon}
                onChange={(event) =>
                  updateDraft({ icon: event.target.value as CustomActionIcon })
                }
              >
                {CUSTOM_ACTION_ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {iconLabel(icon)}
                  </option>
                ))}
              </Select>
            </span>
          </label>

          <fieldset>
            <legend>{t.settings.contextActionsTargets}</legend>
            <span className="settings_context_action_targets">
              {CUSTOM_ACTION_TARGET_OPTIONS.map((target) => (
                <label key={target}>
                  <Switcher
                    checked={draft.targets.includes(target)}
                    onChange={() => toggleTarget(target)}
                  />
                  {targetLabel(target)}
                </label>
              ))}
            </span>
          </fieldset>

          <label>
            <span>{t.settings.contextActionsExtensions}</span>
            <TextInput
              value={draft.extensions}
              onChange={(event) =>
                updateDraft({ extensions: event.target.value })
              }
              placeholder={t.settings.contextActionsExtensionsPlaceholder}
              disabled={!draft.targets.includes(CUSTOM_ACTION_TARGET.FILE)}
              spellCheck={false}
            />
          </label>
          <label>
            <span>{t.settings.contextActionsCommand}</span>
            <TextInput
              value={draft.command}
              onChange={(event) => updateDraft({ command: event.target.value })}
              placeholder={t.settings.contextActionsCommandPlaceholder}
              spellCheck={false}
            />
          </label>
          <label className="settings_context_action_args">
            <span>{t.settings.contextActionsArguments}</span>
            <TextArea
              value={draft.args}
              onChange={(event) => updateDraft({ args: event.target.value })}
              placeholder={t.settings.contextActionsArgumentsPlaceholder}
              rows={CUSTOM_ACTION_ARGUMENT_ROWS}
              spellCheck={false}
            />
          </label>

          <span className="settings_context_action_form_actions">
            <Button
              type="submit"
              variant={BUTTON_VARIANT.PRIMARY}
              disabled={
                saving ||
                !draft.label.trim() ||
                !draft.command.trim() ||
                draft.targets.length === 0
              }
            >
              {t.settings.contextActionsSave}
            </Button>
            <Button
              variant={BUTTON_VARIANT.TEXT}
              disabled={saving}
              onClick={() => setDraft(null)}
            >
              {t.settings.contextActionsCancel}
            </Button>
          </span>
        </form>
      )}
    </div>
  );
};

export default ContextActionsBelow;
