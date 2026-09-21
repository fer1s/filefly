import { FILE_CATEGORY, type FileCategory } from "@/shared/constants";
import { t } from "@/lang";

// The category a freshly opened editor is aimed at. Audio is the common case for a custom
// extension (codecs the app doesn't ship a default for, e.g. .opus).
export const DEFAULT_EDITOR_CATEGORY: FileCategory = FILE_CATEGORY.AUDIO;

// Category → display label. Lazily resolved so it honours the active dictionary (§4).
export const categoryLabel = (category: FileCategory): string =>
  t.settings.fileTypeCategories[category];
