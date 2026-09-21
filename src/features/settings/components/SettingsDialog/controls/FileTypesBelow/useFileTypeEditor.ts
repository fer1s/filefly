import { useState } from "react";

import { FILE_CATEGORY_ORDER, type FileCategory } from "@/shared/constants";
import {
  conflictingCategory,
  normalizeExtension,
} from "@/features/directory/formats";

import type { CustomControlProps } from "../../../../schema";
import { DEFAULT_EDITOR_CATEGORY } from "./constants";
import type { DuplicateError } from "./types";

// Editor state for the extension → category map: which category is being added to, the draft
// extension, and the duplicate rejection. Writes go straight to settings (the map is persisted
// whole, like every other setting).
export const useFileTypeEditor = ({ settings, update }: CustomControlProps) => {
  const [category, setCategory] = useState<FileCategory>(
    DEFAULT_EDITOR_CATEGORY,
  );
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateError | null>(null);

  const extensions = settings.fileTypeExtensions;

  const beginAdd = (next: FileCategory) => {
    setCategory(next);
    setDraft("");
    setDuplicate(null);
    setEditing(true);
  };

  const cancelAdd = () => {
    setEditing(false);
    setDraft("");
    setDuplicate(null);
  };

  const add = () => {
    const ext = normalizeExtension(draft);
    if (!ext) return;
    // An extension in two categories would make its glyph and preview depend on resolution order,
    // so the add is refused and the user is told which category already owns it.
    const owner = conflictingCategory(extensions, ext, category);
    if (owner) {
      setDuplicate({ extension: ext, category: owner });
      return;
    }
    setDuplicate(null);
    setDraft("");
    if (extensions[category].includes(ext)) return;
    setEditing(false);
    update({
      fileTypeExtensions: {
        ...extensions,
        [category]: [...extensions[category], ext],
      },
    });
  };

  const remove = (from: FileCategory, ext: string) =>
    update({
      fileTypeExtensions: {
        ...extensions,
        [from]: extensions[from].filter((entry) => entry !== ext),
      },
    });

  // Typing again clears a stale rejection, so the message always refers to what is in the input.
  const changeDraft = (value: string) => {
    setDraft(value);
    if (duplicate) setDuplicate(null);
  };

  return {
    categories: FILE_CATEGORY_ORDER,
    extensions,
    category,
    editing,
    beginAdd,
    cancelAdd,
    draft,
    changeDraft,
    duplicate,
    add,
    remove,
  };
};
