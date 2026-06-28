import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import Spinner from "@/shared/components/elements/Spinner";
import {
  AUDIO_FORMATS,
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  KEY,
  MARKDOWN_FORMAT,
  PDF_FORMAT,
} from "@/shared/constants";
import {
  useKeymap,
  matchesBinding,
  formatBinding,
  KEYMAP_ACTION,
} from "@/shared/keymap";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import AudioPreview from "../AudioPreview";

import {
  faChevronLeft,
  faChevronRight,
  faXmark,
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
      if (matchesBinding(e, keymap[KEYMAP_ACTION.PREVIEW_PREV])) onPrev();
      else if (matchesBinding(e, keymap[KEYMAP_ACTION.PREVIEW_NEXT])) onNext();
      // Close is fixed to Escape (not user-configurable), like other universal cancels.
      else if (e.key === KEY.ESCAPE) setPreviewVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [keymap, onNext, onPrev, previewVisible, setPreviewVisible]);

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
          <div className="preview_header">
            <div className="preview_nav">
              <IconButton
                icon={faChevronLeft}
                onClick={onPrev}
                disabled={!hasPrev}
                tooltip={t.common.previous}
                hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_PREV])}
                aria-label={t.common.previous}
              />
              <IconButton
                icon={faChevronRight}
                onClick={onNext}
                disabled={!hasNext}
                tooltip={t.common.next}
                hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_NEXT])}
                aria-label={t.common.next}
              />
            </div>
            <h4>{t.common.preview}</h4>
            <IconButton
              icon={faXmark}
              onClick={() => setPreviewVisible(false)}
              tooltip={t.common.close}
              hotkey={formatBinding({ keys: [KEY.ESCAPE] })}
              aria-label={t.common.close}
            />
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
                <img src={convertFileSrc(filePath)} alt={filePath} />
              ) : VIDEO_FORMATS.includes(fileType) ? (
                <video
                  ref={videoRef}
                  src={convertFileSrc(filePath)}
                  controls
                  autoPlay
                />
              ) : fileType === PDF_FORMAT ? (
                <iframe src={convertFileSrc(filePath)} title={t.common.preview} />
              ) : (
                <div className="preview_file_not_supported">
                  <h3>{t.directory.fileTypeNotSupported}</h3>
                </div>
              )
            ) : (
              <Spinner />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Preview;
