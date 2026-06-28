import { ENTRY_KIND, type EntryKind } from "@/shared/constants";
import type { ContextMenuLayout } from "@/shared/models";

type ResolveArgs = {
  isCurrentDirectory: boolean;
  elementType: EntryKind;
  // Lowercased file extension (no dot); ignored for folders.
  extension: string;
};

// Resolve the ordered action-id list for a given context: the current directory background,
// a folder, or a file (matched to a file-type rule by extension, falling back to [file]).
export const resolveActionIds = (
  layout: ContextMenuLayout,
  { isCurrentDirectory, elementType, extension }: ResolveArgs,
): string[] => {
  if (isCurrentDirectory) return layout.directory.actions;
  if (elementType === ENTRY_KIND.DIRECTORY) return layout.folder.actions;

  const ext = extension.toLowerCase();
  for (const rule of Object.values(layout.file_type)) {
    if (rule.extensions.some((e) => e.toLowerCase() === ext)) return rule.actions;
  }
  return layout.file.actions;
};
