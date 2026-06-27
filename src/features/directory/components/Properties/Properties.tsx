import { useEffect } from "react";

import { formatBytes } from "@/shared/utils";
import IconButton from "@/shared/components/elements/IconButton";
import Dialog from "@/shared/components/patterns/Dialog";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { KEY } from "@/shared/constants";
import { formatBinding } from "@/shared/keymap";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Properties.css";

import { PROPERTIES_TITLE_ID } from "./constants";
import { formatDate } from "./utils";
import type { PropertiesProps } from "./types";

// Close is fixed to Escape (not user-configurable), like other universal cancels.
const CLOSE_HOTKEY = formatBinding({ keys: [KEY.ESCAPE] });

const Properties = ({ entry, visible, onClose }: PropertiesProps) => {
  // Confirm with a toast when the user copies selected text from the popup. The native copy
  // does the actual clipboard write; this only surfaces the feedback.
  useEffect(() => {
    if (!visible) return;

    const handleCopy = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) notify(t.common.copied, TOAST_TYPE.SUCCESS);
    };

    document.addEventListener("copy", handleCopy);
    return () => document.removeEventListener("copy", handleCopy);
  }, [visible]);

  // Close the popup on Escape.
  useEffect(() => {
    if (!visible) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === KEY.ESCAPE) onClose();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [visible, onClose]);

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="properties_modal"
      labelledBy={PROPERTIES_TITLE_ID}
    >
      <div className="properties_header">
        <h4 id={PROPERTIES_TITLE_ID}>{t.properties.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={onClose}
          tooltip={t.common.close}
          hotkey={CLOSE_HOTKEY}
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
