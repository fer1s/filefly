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

import {
  ARCHIVE_FORMATS,
  AUDIO_FORMATS,
  CODE_FORMATS,
  CSV_FORMATS,
  IMAGE_FORMATS,
  MARKDOWN_FORMATS,
  PDF_FORMAT,
  PRESENTATION_FORMATS,
  SPREADSHEET_FORMATS,
  TEXT_FORMATS,
  VIDEO_FORMATS,
  WORD_FORMATS,
} from "@/shared/constants";

// Declarative file-type → glyph registry. The first group whose formats include the extension
// wins (groups are disjoint today, so order is cosmetic). Extend by adding a row — no branching.
const FILE_ICON_REGISTRY: readonly {
  formats: readonly string[];
  icon: IconDefinition;
}[] = [
  { formats: ARCHIVE_FORMATS, icon: faFileZipper },
  { formats: AUDIO_FORMATS, icon: faFileAudio },
  { formats: VIDEO_FORMATS, icon: faFileVideo },
  { formats: IMAGE_FORMATS, icon: faFileImage },
  { formats: [PDF_FORMAT], icon: faFilePdf },
  { formats: WORD_FORMATS, icon: faFileWord },
  { formats: SPREADSHEET_FORMATS, icon: faFileExcel },
  { formats: CSV_FORMATS, icon: faFileCsv },
  { formats: PRESENTATION_FORMATS, icon: faFilePowerpoint },
  { formats: CODE_FORMATS, icon: faFileCode },
  { formats: [...MARKDOWN_FORMATS, ...TEXT_FORMATS], icon: faFileLines },
];

// Glyph for a file by extension; the generic file icon when no group matches.
export const getFileIcon = (extension: string): IconDefinition => {
  const ext = extension.toLowerCase().trim();
  return (
    FILE_ICON_REGISTRY.find((entry) => entry.formats.includes(ext))?.icon ??
    faFile
  );
};
