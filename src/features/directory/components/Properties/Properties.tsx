import { useEffect } from "react";

import IconButton from "@/shared/components/elements/IconButton";
import Dialog from "@/shared/components/patterns/Dialog";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { KEY } from "@/shared/constants";
import { formatBinding } from "@/shared/keymap";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Properties.css";

import { PROPERTIES_TITLE_ID } from "./constants";
import { PropertiesContent } from "./PropertiesContent";
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
      {entry && <PropertiesContent entry={entry} />}
    </Dialog>
  );
};

export default Properties;
