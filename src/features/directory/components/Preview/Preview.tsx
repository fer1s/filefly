import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import Spinner from "@/shared/components/elements/Spinner";
import Icon from "@/shared/components/elements/Icon";
import CloseButton from "@/shared/components/patterns/CloseButton";
import ZoomControl from "@/shared/components/patterns/ZoomControl";
import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import {
  AUDIO_FORMATS,
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  ENTRY_KIND,
  KEY,
  MARKDOWN_FORMAT,
  PDF_FORMAT,
} from "@/shared/constants";
import {
  useKeymap,
  matchesBinding,
  formatBinding,
  isMacPlatform,
  KEYMAP_ACTION,
} from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import AudioPreview from "../AudioPreview";
import { useContextMenu } from "../../hooks/useContextMenu";

import { ZoomableImage } from "./ZoomableImage";
import { useImageZoom } from "./useImageZoom";
import {
  IMAGE_ZOOM_MIN,
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_BUTTON_STEP,
} from "./constants";

import {
  faChevronLeft,
  faChevronRight,
  faCopy,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Preview.css";

import type { PreviewProps } from "./types";

const Preview = ({
  fileType,
  filePath,
  previewVisible,
  setPreviewVisible,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: PreviewProps) => {
  const { fs } = useStateContext();
  const { keymap } = useKeymap();
  const {
    ref: imageMenuRef,
    visible: imageMenuVisible,
    openAt: openImageMenu,
    setVisible: setImageMenuVisible,
  } = useContextMenu();

  const mac = isMacPlatform();
  const isImage = IMAGE_FORMATS.includes(fileType);
  // Image zoom lives here (not in ZoomableImage) so its control sits in the shared bottom bar.
  const {
    zoom,
    pan,
    setPan,
    zoomTo,
    stepZoom,
    reset: resetZoom,
  } = useImageZoom();

  // Navigation resets the zoom (so the next file opens at 1x) — done here rather than in an
  // effect to avoid a synchronous reset-on-prop-change.
  const goPrev = useCallback(() => {
    resetZoom();
    onPrev();
  }, [resetZoom, onPrev]);
  const goNext = useCallback(() => {
    resetZoom();
    onNext();
  }, [resetZoom, onNext]);

  // Right-click an image → custom menu to copy it to the clipboard. (The webview's native menu
  // is blocked app-wide and would only show "Inspect Element" in dev anyway.)
  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openImageMenu(e.clientX, e.clientY, filePath, ENTRY_KIND.FILE);
  };

  const handleCopyImage = async () => {
    setImageMenuVisible(false);
    try {
      await fs.copyImage(filePath);
      notify(t.common.copied, TOAST_TYPE.SUCCESS);
    } catch (err) {
      notify(t.errors.copyImage(String(err)), TOAST_TYPE.ERROR);
    }
  };

  // The preview container stays mounted (just hidden) when closed, so a playing video keeps
  // going. Pause and rewind it whenever the preview isn't visible.
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (previewVisible || !videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
  }, [previewVisible]);

  const [markdownPreview, setMarkdownPreview] = useState<{
    filePath: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (!previewVisible || fileType !== MARKDOWN_FORMAT) return;

    let cancelled = false;
    fs.markdownPreview(filePath).then((content) => {
      if (!cancelled) setMarkdownPreview({ filePath, content });
    });

    return () => {
      cancelled = true;
    };
  }, [filePath, fileType, fs, previewVisible]);

  const isReady =
    fileType !== MARKDOWN_FORMAT || markdownPreview?.filePath === filePath;
  const previewContent =
    markdownPreview?.filePath === filePath ? markdownPreview.content : "";

  // Keyboard control while the preview is open: arrows navigate, Escape closes.
  useEffect(() => {
    if (!previewVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesBinding(e, keymap[KEYMAP_ACTION.PREVIEW_PREV])) goPrev();
      else if (matchesBinding(e, keymap[KEYMAP_ACTION.PREVIEW_NEXT])) goNext();
      // Close is fixed to Escape (not user-configurable), like other universal cancels.
      else if (e.key === KEY.ESCAPE) setPreviewVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [keymap, goNext, goPrev, previewVisible, setPreviewVisible]);

  return (
    <>
      <div
        className={classNames("preview_backdrop", previewVisible && "visible")}
        onClick={() => setPreviewVisible(false)}
      ></div>
      {AUDIO_FORMATS.includes(fileType) ? (
        <AudioPreview
          key={`${filePath}:${previewVisible}`}
          isVisible={previewVisible}
          filePath={filePath}
        />
      ) : (
        <div
          className={classNames(
            "preview_container",
            "shadow",
            (IMAGE_FORMATS.includes(fileType) ||
              VIDEO_FORMATS.includes(fileType) ||
              fileType === PDF_FORMAT) &&
              "image",
            previewVisible && "visible",
          )}
        >
          <div className={classNames("preview_header", mac && "mac")}>
            {mac && <CloseButton onClose={() => setPreviewVisible(false)} />}
            <h4>{t.common.preview}</h4>
            {!mac && <CloseButton onClose={() => setPreviewVisible(false)} />}
          </div>
          <div
            className={classNames(
              "preview_content",
              !isReady && "loading",
              fileType === MARKDOWN_FORMAT && "markdown",
              IMAGE_FORMATS.includes(fileType) && "image",
              VIDEO_FORMATS.includes(fileType) && "video",
              fileType === PDF_FORMAT && "pdf",
            )}
          >
            {isReady ? (
              fileType === MARKDOWN_FORMAT ? (
                <div dangerouslySetInnerHTML={{ __html: previewContent }}></div>
              ) : IMAGE_FORMATS.includes(fileType) ? (
                <ZoomableImage
                  key={filePath}
                  src={convertFileSrc(filePath)}
                  alt={filePath}
                  onContextMenu={handleImageContextMenu}
                  zoom={zoom}
                  pan={pan}
                  onZoomTo={zoomTo}
                  onPanChange={setPan}
                />
              ) : VIDEO_FORMATS.includes(fileType) ? (
                <video
                  ref={videoRef}
                  src={convertFileSrc(filePath)}
                  controls
                  autoPlay
                />
              ) : fileType === PDF_FORMAT ? (
                <iframe
                  src={convertFileSrc(filePath)}
                  title={t.common.preview}
                />
              ) : (
                <div className="preview_file_not_supported">
                  <h3>{t.directory.fileTypeNotSupported}</h3>
                </div>
              )
            ) : (
              <Spinner />
            )}
          </div>

          {/* Floating controls, centred over the content: prev · (zoom for images) · next. */}
          <div className="preview_controls">
            <IconButton
              icon={faChevronLeft}
              onClick={goPrev}
              disabled={!hasPrev}
              tooltip={t.common.previous}
              hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_PREV])}
              aria-label={t.common.previous}
            />
            {isImage && (
              <ZoomControl
                value={zoom}
                min={IMAGE_ZOOM_MIN}
                max={IMAGE_ZOOM_MAX}
                onZoomIn={() => stepZoom(IMAGE_ZOOM_BUTTON_STEP)}
                onZoomOut={() => stepZoom(-IMAGE_ZOOM_BUTTON_STEP)}
                onZoomTo={zoomTo}
              />
            )}
            <IconButton
              icon={faChevronRight}
              onClick={goNext}
              disabled={!hasNext}
              tooltip={t.common.next}
              hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_NEXT])}
              aria-label={t.common.next}
            />
          </div>
        </div>
      )}

      <ContextMenu contextMenuVisible={imageMenuVisible} ref={imageMenuRef}>
        <ContextMenuItem
          text={t.contextMenu.copyImage}
          icon={<Icon icon={faCopy} />}
          onClick={handleCopyImage}
        />
      </ContextMenu>
    </>
  );
};

export default Preview;
