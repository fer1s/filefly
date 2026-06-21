import { useEffect, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import { ImageFormats, AudioFormats } from "@/shared/constants";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import AudioPreview from "./AudioPreview";
import Spinner from "@/shared/components/Spinner";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Preview.css";

interface PreviewProps {
  fileType: string;
  filePath: string;

  previewVisible: boolean;
  setPreviewVisible: (visible: boolean) => void;

  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

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

  const [markdownPreview, setMarkdownPreview] = useState<{
    filePath: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (!previewVisible || fileType !== "md") return;

    let cancelled = false;
    fs.markdownPreview(filePath).then((content) => {
      if (!cancelled) setMarkdownPreview({ filePath, content });
    });

    return () => {
      cancelled = true;
    };
  }, [filePath, fileType, fs, previewVisible]);

  const isReady = fileType !== "md" || markdownPreview?.filePath === filePath;
  const previewContent =
    markdownPreview?.filePath === filePath ? markdownPreview.content : "";

  // Keyboard control while the preview is open: arrows navigate, Escape closes.
  useEffect(() => {
    if (!previewVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
      else if (e.key === "Escape") setPreviewVisible(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onNext, onPrev, previewVisible, setPreviewVisible]);

  return (
    <>
      <div
        className={classNames("preview_backdrop", previewVisible && "visible")}
        onClick={() => setPreviewVisible(false)}
      ></div>
      {AudioFormats.includes(fileType) ? (
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
            ImageFormats.includes(fileType) && "image",
            previewVisible && "visible",
          )}
        >
          <div className="preview_header">
            <div className="preview_nav">
              <button
                className="nav_btn"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label={t.common.previous}
              >
                <FontAwesomeIcon icon={faChevronLeft} />
              </button>
              <button
                className="nav_btn"
                onClick={onNext}
                disabled={!hasNext}
                aria-label={t.common.next}
              >
                <FontAwesomeIcon icon={faChevronRight} />
              </button>
            </div>
            <h4>{t.common.preview}</h4>
            <button onClick={() => setPreviewVisible(false)}>
              {t.common.close}
            </button>
          </div>
          <div
            className={classNames(
              "preview_content",
              !isReady && "loading",
              fileType === "md" && "markdown",
              ImageFormats.includes(fileType) && "image",
            )}
          >
            {isReady ? (
              fileType === "md" ? (
                <div dangerouslySetInnerHTML={{ __html: previewContent }}></div>
              ) : ImageFormats.includes(fileType) ? (
                <img src={convertFileSrc(filePath)} alt={filePath} />
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
