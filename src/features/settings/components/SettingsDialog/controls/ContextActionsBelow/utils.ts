import type { CustomContextAction } from "@/shared/models";
import { CUSTOM_ACTION_ICON } from "@/shared/constants";

import type { ContextActionDraft } from "./types";

const splitExtensions = (value: string): string[] =>
  value
    .split(/[\s,]+/)
    .map((extension) => extension.trim().replace(/^\./, "").toLowerCase())
    .filter(Boolean);

const splitArguments = (value: string): string[] =>
  value
    .split("\n")
    .map((argument) => argument.trim())
    .filter(Boolean);

export const newContextActionDraft = (): ContextActionDraft => ({
  id: `custom-${crypto.randomUUID()}`,
  label: "",
  icon: CUSTOM_ACTION_ICON.BOLT,
  targets: [],
  extensions: "",
  command: "",
  args: "",
  enabled: true,
});

export const toContextActionDraft = (
  action: CustomContextAction,
): ContextActionDraft => ({
  ...action,
  extensions: action.extensions.join(", "),
  args: action.args.join("\n"),
});

export const toCustomContextAction = (
  draft: ContextActionDraft,
): CustomContextAction => ({
  id: draft.id,
  label: draft.label.trim(),
  icon: draft.icon,
  targets: [...draft.targets],
  extensions: [...new Set(splitExtensions(draft.extensions))],
  command: draft.command.trim(),
  args: splitArguments(draft.args),
  enabled: draft.enabled,
});
