import { formatBytes } from "@/shared/utils";
import IconButton from "@/shared/components/elements/IconButton";
import Dialog from "@/shared/components/patterns/Dialog";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Properties.css";

import { formatDate } from "./utils";
import type { PropertiesProps } from "./types";

const Properties = ({ entry, visible, onClose }: PropertiesProps) => {
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="properties_modal"
      labelledBy="properties-title"
    >
      <div className="properties_header">
        <h4 id="properties-title">{t.properties.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={onClose}
          title={t.common.close}
          aria-label={t.common.close}
        />
      </div>
      {entry && (
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
            <div className="row">
              <span className="label">{t.properties.size}</span>
              <span className="value">{formatBytes(entry.size)}</span>
            </div>
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
      )}
    </Dialog>
  );
};

export default Properties;
