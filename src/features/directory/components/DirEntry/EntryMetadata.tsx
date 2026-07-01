import type { ReactNode } from "react";

import { formatBytes } from "@/shared/utils";
import { t } from "@/lang";

import type { DirEntry } from "@/shared/models";

// One key/value pair in the metadata card.
const MetadataRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <>
    <span className="entry_metadata_key">{label}</span>
    <span className="entry_metadata_value">{value}</span>
  </>
);

type EntryMetadataProps = {
  entry: DirEntry;
  extension: string;
};

// Hover card with the entry's metadata, shown via the shared Tooltip (Finder/Explorer-style).
const EntryMetadata = ({ entry, extension }: EntryMetadataProps) => (
  <div className="entry_metadata">
    <span className="entry_metadata_title">{t.details.title}</span>
    <div className="entry_metadata_rows">
      <MetadataRow label={t.details.name} value={entry.name} />
      <MetadataRow
        label={t.details.type}
        value={entry.metadata.isDir ? t.common.directory : t.common.file}
      />
      <MetadataRow label={t.details.path} value={entry.path} />
      {entry.metadata.isFile && (
        <>
          <MetadataRow
            label={t.details.extension}
            value={extension || t.common.unknown}
          />
          <MetadataRow label={t.details.size} value={formatBytes(entry.size)} />
        </>
      )}
    </div>
  </div>
);

export { EntryMetadata };
