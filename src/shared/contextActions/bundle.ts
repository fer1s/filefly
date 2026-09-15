import {
  CUSTOM_ACTION_ICON,
  CUSTOM_ACTION_TARGET,
  type CustomActionIcon,
  type CustomActionTarget,
} from "@/shared/constants";
import type { CustomContextAction } from "@/shared/models";

// Shareable custom-action bundle: what "Export actions" writes and "Import actions" reads, so a
// user can hand their context-menu actions to someone else. Plain JSON (not the app's
// context_menu.toml) — it carries only the custom actions, never the built-in menu layout.
export const CONTEXT_ACTIONS_BUNDLE_KIND = "sito-file-browser.context-actions";
export const CONTEXT_ACTIONS_BUNDLE_VERSION = 1;
export const CONTEXT_ACTIONS_BUNDLE_FILE = "context-actions.json";
export const CONTEXT_ACTIONS_BUNDLE_EXTENSION = "json";

export type ContextActionsBundle = {
  kind: typeof CONTEXT_ACTIONS_BUNDLE_KIND;
  version: number;
  actions: CustomContextAction[];
};

const ICON_VALUES = Object.values(CUSTOM_ACTION_ICON) as string[];
const TARGET_VALUES = Object.values(CUSTOM_ACTION_TARGET) as string[];

// Where the bundle lands inside the folder the user picked. Tolerates a trailing separator.
export const contextActionsBundlePath = (dir: string) =>
  `${dir.replace(/[\\/]+$/, "")}/${CONTEXT_ACTIONS_BUNDLE_FILE}`;

export const toContextActionsBundle = (
  actions: CustomContextAction[],
): ContextActionsBundle => ({
  kind: CONTEXT_ACTIONS_BUNDLE_KIND,
  version: CONTEXT_ACTIONS_BUNDLE_VERSION,
  actions,
});

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

// One entry of an imported file, or null when it can't be trusted (missing label/command/target).
// Unknown icons fall back to the default rather than rejecting the whole action, and ids are
// regenerated on import so a shared bundle never collides with an unrelated local action.
const toAction = (value: unknown): CustomContextAction | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  const command = typeof raw.command === "string" ? raw.command.trim() : "";
  const targets = strings(raw.targets).filter((target) =>
    TARGET_VALUES.includes(target),
  ) as CustomActionTarget[];
  if (!label || !command || targets.length === 0) return null;
  const icon =
    typeof raw.icon === "string" && ICON_VALUES.includes(raw.icon)
      ? (raw.icon as CustomActionIcon)
      : CUSTOM_ACTION_ICON.BOLT;
  return {
    id: `custom-${crypto.randomUUID()}`,
    label,
    icon,
    targets,
    extensions: [
      ...new Set(
        strings(raw.extensions).map((extension) =>
          extension.trim().replace(/^\./, "").toLowerCase(),
        ),
      ),
    ].filter(Boolean),
    command,
    args: strings(raw.args),
    enabled: raw.enabled !== false,
  };
};

// Validate a file the user picked (rule 2: external data is validated before it reaches a view).
// Throws a human-readable reason — the caller shows it in the import-error toast.
export const parseContextActionsBundle = (
  raw: string,
  reasons: { invalid: string; empty: string },
): CustomContextAction[] => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(reasons.invalid);
  }
  // Accept both the bundle envelope and a bare array of actions (hand-written files).
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>).actions
      : null;
  if (!Array.isArray(list)) throw new Error(reasons.invalid);
  const actions = list
    .map(toAction)
    .filter((action): action is CustomContextAction => action !== null);
  if (actions.length === 0) throw new Error(reasons.empty);
  return actions;
};
