import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import {
  faFile,
  faFileAudio,
  faFileCode,
  faFileCsv,
  faFileExcel,
  faFileImage,
  faFileLines,
  faFilePdf,
  faFilePowerpoint,
  faFileVideo,
  faFileWord,
  faFileZipper,
} from "@fortawesome/free-solid-svg-icons";

import { FILE_CATEGORY, type FileTypeExtensions } from "@/shared/constants";

import { categoryOf } from "../../formats";

// Declarative file-category → glyph registry. Which extensions land in a category is the user's
// call (Settings › File types); the glyph for a category is not — that mapping lives here so the
// user never has to pick an icon. Extend by adding a category + row, no branching.
export const FILE_ICON_REGISTRY: Record<
  (typeof FILE_CATEGORY)[keyof typeof FILE_CATEGORY],
  IconDefinition
> = {
  [FILE_CATEGORY.ARCHIVE]: faFileZipper,
  [FILE_CATEGORY.AUDIO]: faFileAudio,
  [FILE_CATEGORY.VIDEO]: faFileVideo,
  [FILE_CATEGORY.IMAGE]: faFileImage,
  [FILE_CATEGORY.PDF]: faFilePdf,
  [FILE_CATEGORY.WORD]: faFileWord,
  [FILE_CATEGORY.SPREADSHEET]: faFileExcel,
  [FILE_CATEGORY.CSV]: faFileCsv,
  [FILE_CATEGORY.PRESENTATION]: faFilePowerpoint,
  [FILE_CATEGORY.CODE]: faFileCode,
  [FILE_CATEGORY.TEXT]: faFileLines,
  [FILE_CATEGORY.MARKDOWN]: faFileLines,
};

// Glyph for a file by extension; the generic file icon when no category claims it.
export const getFileIcon = (
  extensions: FileTypeExtensions,
  extension: string,
): IconDefinition => {
  const category = categoryOf(extensions, extension);
  return category ? FILE_ICON_REGISTRY[category] : faFile;
};

// Every glyph getFileIcon can return, for pre-rendering them (e.g. as native drag previews).
// Category-keyed, so it never changes with the user's extension map.
export const FILE_ICONS: readonly IconDefinition[] = [
  ...Object.values(FILE_ICON_REGISTRY),
  faFile,
];
