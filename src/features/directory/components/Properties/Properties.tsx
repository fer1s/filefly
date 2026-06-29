import { useEffect } from "react";

import Dialog from "@/shared/components/patterns/Dialog";
import DialogHeader from "@/shared/components/patterns/DialogHeader";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { t } from "@/lang";

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
      <DialogHeader
        title={t.properties.title}
        titleId={PROPERTIES_TITLE_ID}
        onClose={onClose}
      />
      {entry && <PropertiesContent entry={entry} />}
    </Dialog>
  );
};

export default Properties;
