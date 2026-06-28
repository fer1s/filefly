import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { classNames } from "@/shared/utils";
import {
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  AUDIO_FORMATS,
  PDF_FORMAT,
} from "@/shared/constants";
import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { useDirectory } from "../../providers/DirectoryProvider";
import { PropertiesContent } from "../Properties/PropertiesContent";

import "@/styles/components/InfoPanel.css";
import { CLOSE_HOTKEY } from "./constants";

// Right side panel: an inline preview (when possible) plus the same metadata as the Properties
// dialog, for the single selected entry. Slides in/out (like the sidebar); shown only when the
// toggle is on and exactly one entry is selected. Always mounted so the transition can play.
const InfoPanel = () => {
  const { infoPanelOpen } = useStateContext();
  const { selectedIDs, sorted, clearSelection } = useDirectory();

  // Only details a single entry: hidden when the toggle is off, nothing is selected, or more
  // than one is selected (e.g. Ctrl+A).
  const entry =
    selectedIDs.length === 1
      ? sorted.find((item) => item.path === selectedIDs[0])
      : undefined;

  const visible = infoPanelOpen && !!entry;

  const extension = entry
    ? (entry.name.split(".").pop() || "").toLowerCase()
    : "";
  const src = entry ? convertFileSrc(entry.path) : "";

  let preview = null;
  if (entry?.metadata.isFile) {
    if (IMAGE_FORMATS.includes(extension))
      preview = <img src={src} alt={entry.name} draggable={false} />;
    else if (VIDEO_FORMATS.includes(extension))
      preview = <video src={src} controls />;
    else if (AUDIO_FORMATS.includes(extension))
      preview = <audio src={src} controls />;
    else if (extension === PDF_FORMAT)
      preview = <iframe src={src} title={entry.name} />;
  }

  return (
    <aside className={classNames("InfoPanel", !visible && "closed")}>
      <div className="info_header">
        <h4>{t.infoPanel.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={clearSelection}
          tooltip={t.common.close}
          hotkey={CLOSE_HOTKEY}
          aria-label={t.common.close}
        />
      </div>
      <div className="info_body">
        {entry && (
          <>
            {preview && <div className="info_preview">{preview}</div>}
            <PropertiesContent entry={entry} />
          </>
        )}
      </div>
    </aside>
  );
};

export default InfoPanel;
