import { ENTRY_KIND } from "@/features/directory/constants";
import {
  CUSTOM_ACTION_TARGET,
  RECENTS,
  SFTP_SCHEME,
  TAGS_PREFIX,
} from "@/shared/constants";
import { extension } from "@/shared/utils";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ContextMenuLayout } from "@/shared/models";

import type {
  EntryAction,
  EntryActionContext,
  ResolveArgs,
  ResolveCustomActionsArgs,
  ResolvedCustomAction,
} from "./types";

// True when extracting this archive requires the system 7-Zip binary: only .zip has a pure-Rust
// path; everything else (7z, rar) shells out. Gates the extract actions' visibility so formats
// the machine can't actually open aren't offered.
export const archiveNeedsSevenzip = (path: string) =>
  extension(path).toLowerCase() !== "zip";

// Resolve the ordered action-id list for a given context: the current directory background,
// a folder, or a file (matched to a file-type rule by extension, falling back to [file]).
export const resolveActionIds = (
  layout: ContextMenuLayout,
  { isCurrentDirectory, inTrash, elementType, extension }: ResolveArgs,
): string[] => {
  if (isCurrentDirectory) return layout.directory.actions;
  // A trashed entry takes the [trash] layout regardless of its kind.
  if (inTrash) return layout.trash.actions;
  if (elementType === ENTRY_KIND.DIRECTORY) return layout.folder.actions;

  const ext = extension.toLowerCase();
  for (const rule of Object.values(layout.file_type)) {
    if (rule.extensions.some((e) => e.toLowerCase() === ext))
      return rule.actions;
  }
  return layout.file.actions;
};

// User-defined process actions are appended as their own group in the entry context menu. They do
// not enter the predefined registry or Quick Bar: applicability comes from their saved target and
// optional extension list, and virtual/remote/Trash paths are excluded because the backend only
// executes against existing local paths.
export const resolveCustomActions = (
  layout: ContextMenuLayout,
  {
    isCurrentDirectory,
    inTrash,
    elementType,
    extension,
    elementId,
  }: ResolveCustomActionsArgs,
): ResolvedCustomAction[] => {
  if (
    inTrash ||
    elementId === RECENTS ||
    elementId.startsWith(SFTP_SCHEME) ||
    elementId.startsWith(TAGS_PREFIX)
  )
    return [];

  const target = isCurrentDirectory
    ? CUSTOM_ACTION_TARGET.DIRECTORY
    : elementType === ENTRY_KIND.DIRECTORY
      ? CUSTOM_ACTION_TARGET.FOLDER
      : CUSTOM_ACTION_TARGET.FILE;
  const normalizedExtension = extension.toLowerCase();

  return (layout.custom_action ?? []).filter(
    (action) =>
      action.enabled &&
      action.targets.includes(target) &&
      (target !== CUSTOM_ACTION_TARGET.FILE ||
        action.extensions.length === 0 ||
        action.extensions.some(
          (candidate) => candidate.toLowerCase() === normalizedExtension,
        )),
  );
};

// Whether an action should be shown in the current context. Single-target actions (multiple
// === false, e.g. rename) are hidden once more than one entry is selected; an action's own
// isVisible predicate (e.g. Preview when Open already previews) can hide it too.
export const isActionVisible = (
  action: EntryAction,
  ctx: EntryActionContext,
): boolean =>
  (action.multiple !== false || ctx.targets.length <= 1) &&
  (action.isVisible ? action.isVisible(ctx) : true);

// Resolve the action's icon at render time so a shared descriptor can adapt to the entry kind.
export const resolveActionIcon = (
  action: EntryAction,
  ctx: EntryActionContext,
): IconDefinition =>
  typeof action.icon === "function" ? action.icon(ctx) : action.icon;
