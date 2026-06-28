import { formatBytes } from "@/shared/utils";
import { t } from "@/lang";

import "@/styles/components/Properties.css";

import { formatDate } from "./utils";
import type { PropertiesContentProps } from "./types";

// The metadata rows for an entry. Shared by the Properties dialog and the info side panel.
export const PropertiesContent = ({ entry }: PropertiesContentProps) => (
  <div className="properties_content">
    <div className="row">
      <span className="label">{t.properties.name}</span>
      <span className="value">{entry.name}</span>
    </div>
    <div className="row">
      <span className="label">{t.properties.type}</span>
      <span className="value">
        {entry.metadata.isDir ? t.common.directory : t.common.file}
      </span>
    </div>
    <div className="row">
      <span className="label">{t.properties.path}</span>
      <span className="value">{entry.path}</span>
    </div>
    {entry.metadata.isFile && (
      <>
        <div className="row">
          <span className="label">{t.properties.size}</span>
          <span className="value">{formatBytes(entry.size)}</span>
        </div>
        <div className="row">
          <span className="label">{t.properties.sizeOnDisk}</span>
          <span className="value">{formatBytes(entry.sizeOnDisk)}</span>
        </div>
      </>
    )}
    <div className="row">
      <span className="label">{t.properties.created}</span>
      <span className="value">
        {formatDate(entry.metadata.created.secs_since_epoch)}
      </span>
    </div>
    <div className="row">
      <span className="label">{t.properties.modified}</span>
      <span className="value">
        {formatDate(entry.metadata.modified.secs_since_epoch)}
      </span>
    </div>
    <div className="row">
      <span className="label">{t.properties.accessed}</span>
      <span className="value">
        {formatDate(entry.metadata.accessed.secs_since_epoch)}
      </span>
    </div>
  </div>
);
