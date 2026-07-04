import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton, {
  ICON_BUTTON_VARIANT,
} from "@/shared/components/elements/IconButton";
import Spinner from "@/shared/components/elements/Spinner";
import Icon from "@/shared/components/elements/Icon";
import CloseButton from "@/shared/components/patterns/CloseButton";
import ZoomControl from "@/shared/components/patterns/ZoomControl";
import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import { KEY, SFTP_SCHEME } from "@/shared/constants";
import {
  AUDIO_FORMATS,
  IMAGE_FORMATS,
  VIDEO_FORMATS,
  ENTRY_KIND,
  MARKDOWN_FORMAT,
  PDF_FORMAT,
} from "@/features/directory/constants";
import {
  useKeymap,
  useHotkey,
  useHotkeyScope,
  HOTKEY_SCOPE,
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
import { usePanelGeometry } from "./usePanelGeometry";
import { useMarkdownPreview } from "./useMarkdownPreview";
import PreviewFindBar from "./PreviewFindBar";
import PreviewResizeHandles from "./PreviewResizeHandles";
import {
  IMAGE_ZOOM_MIN,
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_BUTTON_STEP,
} from "./constants";

import {
  faChevronLeft,
  faChevronRight,
  faCopy,
  faTrash,
  faPen,
  faEye,
  faFloppyDisk,
  faMagnifyingGlass,
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
  onDelete,
}: PreviewProps) => {
  const { fs } = useStateContext();
  const { keymap } = useKeymap();
  const {
    ref: imageMenuRef,
    visible: imageMenuVisible,
    openAt: openImageMenu,
    setVisible: setImageMenuVisible,
  } = useContextMenu();

  // The webview can only read local files (convertFileSrc / readText). A remote (sftp://) file is
  // downloaded to the cache first and `localPath` points at that copy; local files resolve to
  // themselves synchronously (no flicker). Reset on file change so we never render the previous
  // file's bytes while the next one downloads. Read-only — see SSH_PLAN.md phase 3a.
  const [localPath, setLocalPath] = useState("");
  useEffect(() => {
    if (!previewVisible || !filePath) return;
    if (!filePath.startsWith(SFTP_SCHEME)) {
      setLocalPath(filePath);
      return;
    }
    let cancelled = false;
    setLocalPath("");
    fs.materialize(filePath)
      .then((resolved) => {
        if (!cancelled) setLocalPath(resolved);
      })
      .catch((err) => {
        if (!cancelled)
          notify(t.connections.openError(String(err)), TOAST_TYPE.ERROR);
      });
    return () => {
      cancelled = true;
    };
  }, [filePath, previewVisible, fs]);

  const mac = isMacPlatform();
  const isImage = IMAGE_FORMATS.includes(fileType);
  const isMarkdown = fileType === MARKDOWN_FORMAT;
  // Basename (name.ext) for the header title, e.g. "Preview - notes.md".
  const fileName = filePath.split("/").pop() ?? "";
  // Big media (image/video/pdf) opens near-fullscreen; everything else takes the ~45% side
  const isBig =
    isImage || VIDEO_FORMATS.includes(fileType) || fileType === PDF_FORMAT;

  // Panel position/size (drag, resize, maximize) and markdown doc/find state live in dedicated
  // hooks; this component wires them to the shared chrome (header, controls, hotkeys).
  const {
    style: panelStyle,
    interacting,
    maximized,
    dragBind,
    resizeBind,
    toggleMaximize,
  } = usePanelGeometry({ previewVisible, isBig });
  const {
    doc,
    docReady,
    dirty,
    editMode,
    saving,
    editorRef,
    contentRef,
    findInputRef,
    findOpen,
    findQuery,
    matchIndex,
    matchCount,
    confirmDiscard,
    handleDraftChange,
    showPreview,
    enterEdit,
    save,
    openFind,
    closeFind,
    toggleFind,
    goToMatch,
    handleFindKeyDown,
    onQueryChange,
  } = useMarkdownPreview({
    filePath: localPath,
    // Save back to the original path (remote → server); reading still uses the local cache copy.
    savePath: filePath,
    isMarkdown,
    previewVisible: previewVisible && !!localPath,
  });

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

  // Not ready until the (possibly remote) file is materialized locally; markdown also waits on its
  // parsed doc. An empty localPath means a remote download is still in flight → show the spinner.
  const isReady = !!localPath && (!isMarkdown || docReady);

  // Close / navigate are guarded by the unsaved-edits prompt (they'd otherwise swap the file out
  // from under an in-progress markdown edit).
  const requestClose = useCallback(async () => {
    if (await confirmDiscard()) setPreviewVisible(false);
  }, [confirmDiscard, setPreviewVisible]);
  const navPrev = useCallback(async () => {
    if (await confirmDiscard()) goPrev();
  }, [confirmDiscard, goPrev]);
  const navNext = useCallback(async () => {
    if (await confirmDiscard()) goNext();
  }, [confirmDiscard, goNext]);

  // Keyboard control while the preview is open: arrows navigate, Escape closes. PREVIEW scope sits
  // below MENU/MODAL, so an open image context menu or a dialog consumes Escape first.
  useHotkeyScope(HOTKEY_SCOPE.PREVIEW, previewVisible);
  useHotkey(
    KEYMAP_ACTION.PREVIEW_PREV,
    () => {
      void navPrev();
    },
    { scope: HOTKEY_SCOPE.PREVIEW, when: previewVisible },
  );
  useHotkey(
    KEYMAP_ACTION.PREVIEW_NEXT,
    () => {
      void navNext();
    },
    { scope: HOTKEY_SCOPE.PREVIEW, when: previewVisible },
  );
  // Close is fixed to Escape (not user-configurable), like other universal cancels. Prompts first
  // when a markdown edit is unsaved. allowInInput so Escape still closes while the cursor is in the
  // editor textarea; while find is open it closes find first.
  useHotkey(
    { keys: [KEY.ESCAPE] },
    () => {
      if (findOpen) closeFind();
      else void requestClose();
    },
    { scope: HOTKEY_SCOPE.PREVIEW, when: previewVisible, allowInInput: true },
  );
  // Cmd/Ctrl+F opens the find bar (both edit and preview modes). PREVIEW scope out-ranks the
  // directory search action and allowInInput lets it fire from the textarea, so consuming it
  // prevents the directory's search from opening behind the preview.
  useHotkey({ keys: [KEY.F], mod: true }, openFind, {
    scope: HOTKEY_SCOPE.PREVIEW,
    when: previewVisible && isMarkdown && docReady,
    allowInInput: true,
  });
  // Cmd/Ctrl+S saves the markdown draft (fixed binding). allowInInput so it fires while the cursor
  // is in the editor textarea, and consuming it suppresses the browser's own save dialog.
  useHotkey(
    { keys: [KEY.S], mod: true },
    () => {
      void save();
    },
    {
      scope: HOTKEY_SCOPE.PREVIEW,
      when: previewVisible && isMarkdown,
      allowInInput: true,
    },
  );
  // Cmd/Ctrl +/- zoom the image — a separate action from the directory zoom (which is disabled
  // while a preview is open), bound to the same keys by default and scoped to PREVIEW.
  useHotkey(
    KEYMAP_ACTION.PREVIEW_ZOOM_IN,
    () => stepZoom(IMAGE_ZOOM_BUTTON_STEP),
    { scope: HOTKEY_SCOPE.PREVIEW, when: previewVisible && isImage },
  );
  useHotkey(
    KEYMAP_ACTION.PREVIEW_ZOOM_OUT,
    () => stepZoom(-IMAGE_ZOOM_BUTTON_STEP),
    { scope: HOTKEY_SCOPE.PREVIEW, when: previewVisible && isImage },
  );
  // Trash the previewed file (same binding as the directory's trash, which is disabled while a
  // preview is open). usePreview advances to the next file after the list shrinks.
  useHotkey(KEYMAP_ACTION.TRASH, onDelete, {
    scope: HOTKEY_SCOPE.PREVIEW,
    when: previewVisible,
  });

  return (
    <>
      <div
        className={classNames("preview_backdrop", previewVisible && "visible")}
        onClick={requestClose}
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
            isBig && "image",
            previewVisible && "visible",
            interacting && "interacting",
            maximized && "maximized",
          )}
          style={panelStyle}
        >
          <div
            className={classNames("preview_header", "draggable", mac && "mac")}
            onDoubleClick={toggleMaximize}
            {...dragBind()}
          >
            {mac && <CloseButton onClose={requestClose} />}
            <h4>
              {dirty && <span className="preview_dirty_dot" aria-hidden />}
              {editMode
                ? t.common.editTitle(fileName)
                : t.common.previewTitle(fileName)}
            </h4>
            {!mac && <CloseButton onClose={requestClose} />}
          </div>

          {isMarkdown && docReady && findOpen && (
            <PreviewFindBar
              inputRef={findInputRef}
              query={findQuery}
              matchCount={matchCount}
              matchIndex={matchIndex}
              onQueryChange={onQueryChange}
              onKeyDown={handleFindKeyDown}
              onPrev={() => goToMatch(-1)}
              onNext={() => goToMatch(1)}
              onClose={closeFind}
            />
          )}

          <div
            className={classNames(
              "preview_content",
              !isReady && "loading",
              isMarkdown && "markdown",
              IMAGE_FORMATS.includes(fileType) && "image",
              VIDEO_FORMATS.includes(fileType) && "video",
              fileType === PDF_FORMAT && "pdf",
            )}
          >
            {isReady ? (
              isMarkdown ? (
                editMode ? (
                  <textarea
                    ref={editorRef}
                    className="preview_md_editor"
                    value={doc?.draft ?? ""}
                    onChange={(e) => handleDraftChange(e.target.value)}
                    spellCheck={false}
                    autoFocus
                  />
                ) : (
                  <div
                    ref={contentRef}
                    dangerouslySetInnerHTML={{ __html: doc?.html ?? "" }}
                  ></div>
                )
              ) : IMAGE_FORMATS.includes(fileType) ? (
                <ZoomableImage
                  key={filePath}
                  src={convertFileSrc(localPath)}
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
                  src={convertFileSrc(localPath)}
                  controls
                  autoPlay
                />
              ) : fileType === PDF_FORMAT ? (
                <iframe
                  src={convertFileSrc(localPath)}
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

          {/* Floating controls, centred over the content: prev · (md/zoom tools) · next · trash. */}
          <div className="preview_controls">
            <IconButton
              icon={faChevronLeft}
              onClick={navPrev}
              disabled={!hasPrev}
              tooltip={t.common.previous}
              hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_PREV])}
              aria-label={t.common.previous}
            />
            {isMarkdown && docReady && (
              <>
                <IconButton
                  icon={editMode ? faEye : faPen}
                  onClick={editMode ? showPreview : enterEdit}
                  tooltip={editMode ? t.common.preview : t.common.edit}
                  aria-label={editMode ? t.common.preview : t.common.edit}
                />
                <IconButton
                  icon={faMagnifyingGlass}
                  onClick={toggleFind}
                  tooltip={t.markdownEditor.findPlaceholder}
                  hotkey={formatBinding({ keys: [KEY.F], mod: true })}
                  aria-label={t.markdownEditor.findPlaceholder}
                />
                <IconButton
                  icon={faFloppyDisk}
                  onClick={save}
                  disabled={!dirty || saving}
                  tooltip={t.common.save}
                  hotkey={formatBinding({ keys: [KEY.S], mod: true })}
                  aria-label={t.common.save}
                />
              </>
            )}
            {isImage && (
              <ZoomControl
                value={zoom}
                min={IMAGE_ZOOM_MIN}
                max={IMAGE_ZOOM_MAX}
                onZoomIn={() => stepZoom(IMAGE_ZOOM_BUTTON_STEP)}
                onZoomOut={() => stepZoom(-IMAGE_ZOOM_BUTTON_STEP)}
                onZoomTo={zoomTo}
                zoomInHotkey={formatBinding(
                  keymap[KEYMAP_ACTION.PREVIEW_ZOOM_IN],
                )}
                zoomOutHotkey={formatBinding(
                  keymap[KEYMAP_ACTION.PREVIEW_ZOOM_OUT],
                )}
              />
            )}
            <IconButton
              icon={faChevronRight}
              onClick={navNext}
              disabled={!hasNext}
              tooltip={t.common.next}
              hotkey={formatBinding(keymap[KEYMAP_ACTION.PREVIEW_NEXT])}
              aria-label={t.common.next}
            />
            <IconButton
              icon={faTrash}
              variant={ICON_BUTTON_VARIANT.DANGER}
              onClick={onDelete}
              tooltip={t.contextMenu.delete}
              hotkey={formatBinding(keymap[KEYMAP_ACTION.TRASH])}
              aria-label={t.contextMenu.delete}
            />
          </div>

          <PreviewResizeHandles bind={resizeBind} />
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
