import { useEffect } from "react";

import IconButton from "@/shared/components/elements/IconButton";
import Dialog from "@/shared/components/patterns/Dialog";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { ESCAPE_HOTKEY } from "@/shared/keymap";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Properties.css";

import { PROPERTIES_TITLE_ID } from "./constants";
import { PropertiesContent } from "./PropertiesContent";
import type { PropertiesProps } from "./types";

const Properties = ({ entry, visible, onClose }: PropertiesProps) => {
  useCloseOnEscape(visible, onClose);

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

  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      className="properties_modal"
      labelledBy={PROPERTIES_TITLE_ID}
    >
      <div className="panel_header">
        <h4 id={PROPERTIES_TITLE_ID}>{t.properties.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={onClose}
          tooltip={t.common.close}
          hotkey={ESCAPE_HOTKEY}
          aria-label={t.common.close}
        />
      </div>
      {entry && <PropertiesContent entry={entry} />}
    </Dialog>
  );
};

export default Properties;
