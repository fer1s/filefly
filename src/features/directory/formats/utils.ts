import {
  FILE_CATEGORY_ORDER,
  DEFAULT_FILE_TYPE_EXTENSIONS,
  type FileCategory,
  type FileTypeExtensions,
} from "@/shared/constants";

// Extensions are compared lowercase and without the leading dot, so ".OPUS", "OPUS" and "opus"
// are the same entry no matter whether they came from the editor or from a hand-edited file.
export const normalizeExtension = (raw: string): string =>
  raw.trim().toLowerCase().replace(/^\.+/, "");

// Fill in categories a stored map is missing and drop keys the app no longer knows about: the
// settings merge is shallow, so an older (or hand-edited) settings.toml can carry a partial map.
export const normalizeFileTypeExtensions = (
  stored: Partial<FileTypeExtensions> | undefined,
): FileTypeExtensions =>
  Object.fromEntries(
    FILE_CATEGORY_ORDER.map((category) => [
      category,
      (stored?.[category] ?? DEFAULT_FILE_TYPE_EXTENSIONS[category]).map(
        normalizeExtension,
      ),
    ]),
  ) as FileTypeExtensions;

// The category an extension belongs to, or null when no category claims it (generic file glyph,
// no thumbnail, no preview).
export const categoryOf = (
  extensions: FileTypeExtensions,
  extension: string,
): FileCategory | null => {
  const ext = normalizeExtension(extension);
  // Optional-chained: a settings object merged shallowly from an older settings.toml can be
  // missing a category entirely, and a missing category simply claims nothing.
  return (
    FILE_CATEGORY_ORDER.find((category) =>
      extensions[category]?.includes(ext),
    ) ?? null
  );
};

// Whether the extension belongs to any of the given categories. The common read shape — callers
// ask "is this previewable/thumbnailable", not "which category is it".
export const isCategory = (
  extensions: FileTypeExtensions,
  extension: string,
  ...categories: readonly FileCategory[]
): boolean => {
  const category = categoryOf(extensions, extension);
  return category !== null && categories.includes(category);
};

// The category currently holding this extension, ignoring `except` (the category being edited).
// Drives the duplicate rejection in the settings editor: one extension, one category.
export const conflictingCategory = (
  extensions: FileTypeExtensions,
  extension: string,
  except: FileCategory,
): FileCategory | null => {
  const ext = normalizeExtension(extension);
  return (
    FILE_CATEGORY_ORDER.find(
      (category) => category !== except && extensions[category]?.includes(ext),
    ) ?? null
  );
};
