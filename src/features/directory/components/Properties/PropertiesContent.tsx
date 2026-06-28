import { formatBytes } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/Properties.css";

import { formatDate } from "./utils";
import { useEntrySize } from "./useEntrySize";
import PropertyRow from "./PropertyRow";
import type { PropertiesContentProps } from "./types";

// The metadata rows for an entry. Shared by the Properties dialog and the info side panel.
export const PropertiesContent = ({ entry }: PropertiesContentProps) => {
  // Files report their size directly; folders are computed (null while calculating).
  const size = useEntrySize(entry);

  return (
    <div className="properties_content">
      <PropertyRow label={t.properties.name} value={entry.name} />
      <PropertyRow
        label={t.properties.type}
        value={entry.metadata.isDir ? t.common.directory : t.common.file}
      />
      <PropertyRow label={t.properties.path} value={entry.path} />
      <PropertyRow
        label={t.properties.size}
        value={size === null ? t.properties.calculating : formatBytes(size)}
      />
      {entry.metadata.isFile && (
        <PropertyRow
          label={t.properties.sizeOnDisk}
          value={formatBytes(entry.sizeOnDisk)}
        />
      )}
      <PropertyRow
        label={t.properties.created}
        value={formatDate(entry.metadata.created.secs_since_epoch)}
      />
      <PropertyRow
        label={t.properties.modified}
        value={formatDate(entry.metadata.modified.secs_since_epoch)}
      />
      <PropertyRow
        label={t.properties.accessed}
        value={formatDate(entry.metadata.accessed.secs_since_epoch)}
      />
    </div>
  );
};
