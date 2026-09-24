import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import { classNames, extension } from "@/shared/utils";

import { t } from "@/lang";

import { faXmark } from "@fortawesome/free-solid-svg-icons";

import { FILE_CATEGORY } from "@/shared/constants";

import { useDirectory } from "../../providers/DirectoryProvider";
import { useFileTypeExtensions, categoryOf } from "../../formats";
import { PropertiesContent } from "../Properties/PropertiesContent";

import "@/styles/components/InfoPanel.css";

// Right side panel: an inline preview (when possible) plus the same metadata as the Properties
// dialog, for the single selected entry. Slides in/out (like the sidebar); shown only when the
// toggle is on and exactly one entry is selected. Always mounted so the transition can play.
const InfoPanel = () => {
  const { infoPanelOpen, toggleInfoPanel } = useStateContext();
  const { selectedIDs, sorted } = useDirectory();
  const fileTypes = useFileTypeExtensions();

  // Details a single entry: undefined when nothing is selected, or more than one is (e.g.
  // Ctrl+A). The panel stays open regardless (showing an empty state) so it doesn't slide
  // open/closed as the selection — or the active tab's folder — changes.
  const entry =
    selectedIDs.length === 1
      ? sorted.find((item) => item.path === selectedIDs[0])
      : undefined;

  const visible = infoPanelOpen;

  const ext = entry ? extension(entry.name) : "";
  const src = entry ? convertFileSrc(entry.path) : "";

  // The inline preview is chosen by the entry's category, so an extension the user mapped onto
  // Audio (e.g. .opus) plays here just like a built-in one — as long as the webview can decode it.
  const category = entry?.metadata.isFile ? categoryOf(fileTypes, ext) : null;
  const preview =
    category === FILE_CATEGORY.IMAGE ? (
      <img src={src} alt={entry?.name} draggable={false} />
    ) : category === FILE_CATEGORY.VIDEO ? (
      <video src={src} controls />
    ) : category === FILE_CATEGORY.AUDIO ? (
      <audio src={src} controls />
    ) : category === FILE_CATEGORY.PDF ? (
      <iframe src={src} title={entry?.name} />
    ) : null;

  return (
    <aside className={classNames("InfoPanel", !visible && "closed")}>
      <div className="panel_header">
        <h4>{t.infoPanel.title}</h4>
        <IconButton
          icon={faXmark}
          onClick={toggleInfoPanel}
          tooltip={t.common.close}
          aria-label={t.common.close}
        />
      </div>
      <div className="info_body">
        {entry ? (
          <>
            {/* Only mount the media preview while open: a PDF/video <iframe> renders WebKit's
                own floating controls as a native overlay that escapes the panel's clip when
                collapsed (width:0). Not rendering it when closed avoids that leak. */}
            {visible && preview && (
              <div className="info_preview">{preview}</div>
            )}
            <PropertiesContent entry={entry} />
          </>
        ) : (
          <p className="info_empty">{t.infoPanel.selectSingle}</p>
        )}
      </div>
    </aside>
  );
};

export default InfoPanel;
