import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import IconButton from "@/shared/components/elements/IconButton";
import Spinner from "@/shared/components/elements/Spinner";
import Icon from "@/shared/components/elements/Icon";
import TextArea from "@/shared/components/elements/TextArea";
import CloseButton from "@/shared/components/patterns/CloseButton";
import ZoomControl from "@/shared/components/patterns/ZoomControl";
import {
  ContextMenu,
  ContextMenuItem,
} from "@/shared/components/patterns/ContextMenu";
import { KEY, SFTP_SCHEME, FILE_CATEGORY } from "@/shared/constants";
import { ENTRY_KIND } from "@/features/directory/constants";
import {
  useFileTypeExtensions,
  categoryOf,
} from "@/features/directory/formats";
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
import PreviewControls from "../PreviewControls/PreviewControls";
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
  IMAGE_ROTATION_ACTIONS,
  IMAGE_COPY_ACTIONS,
} from "./constants";

import {
  faCopy,
  faPen,
  faEye,
  faFloppyDisk,
  faMagnifyingGlass,
  faRotateLeft,
  faRotateRight,
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
  windowed = false,
}: PreviewProps) => {
  const { fs } = useStateContext();
  const { keymap } = useKeymap();
  const fileTypes = useFileTypeExtensions();
  const {
    ref: imageMenuRef,
    visible: imageMenuVisible,
    openAt: openImageMenu,
    setVisible: setImageMenuVisible,
  } = useContextMenu();

  // The webview can only read local files (convertFileSrc / readText). A remote (sftp://) file is
  // downloaded to the cache first; local files resolve to themselves synchronously (no flicker).
  // `materialized` records which remote file the cached copy belongs to, so `localPath` derives to
  // "" (spinner) while a different file downloads — the previous file's bytes are never rendered.
  // Read-only — see SSH_PLAN.md phase 3a.
  const [materialized, setMaterialized] = useState<{
    remote: string;
    local: string;
  } | null>(null);
  const localPath = !filePath.startsWith(SFTP_SCHEME)
    ? filePath
    : materialized?.remote === filePath
      ? materialized.local
      : "";
  useEffect(() => {
    if (!previewVisible || !filePath || !filePath.startsWith(SFTP_SCHEME))
      return;
    let cancelled = false;
    fs.materialize(filePath)
      .then((resolved) => {
        if (!cancelled) setMaterialized({ remote: filePath, local: resolved });
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
  // Everything the preview branches on is the extension's category, so an extension the user
  // mapped onto Image/Video/Audio renders with that surface.
  const category = categoryOf(fileTypes, fileType);
  const isImage = category === FILE_CATEGORY.IMAGE;
  const isVideo = category === FILE_CATEGORY.VIDEO;
  const isPdf = category === FILE_CATEGORY.PDF;
  const isAudio = category === FILE_CATEGORY.AUDIO;
  const isMarkdown = category === FILE_CATEGORY.MARKDOWN;
  // Basename (name.ext) for the header title, e.g. "Preview - notes.md".
  const fileName = filePath.split("/").pop() ?? "";
  // Big media (image/video/pdf) opens near-fullscreen; everything else takes the ~45% side
  const isBig = isImage || isVideo || isPdf;

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
    rotation,
    rotate,
    setPan,
    zoomTo,
    stepZoom,
    reset: resetZoom,
  } = useImageZoom(filePath, previewVisible);

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

  // Right-click an image → copy the original or its current orientation. (The webview's native menu
  // is blocked app-wide and would only show "Inspect Element" in dev anyway.)
  const handleImageContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    openImageMenu(e.clientX, e.clientY, filePath, ENTRY_KIND.FILE);
  };

  const handleCopyImage = async (currentState: boolean) => {
    setImageMenuVisible(false);
    try {
      await fs.copyImage(localPath, currentState ? rotation : undefined);
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
      {/* In-app overlay dims the app behind it; a dedicated window has nothing behind to dim. */}
      {!windowed && (
        <div
          className={classNames(
            "preview_backdrop",
            previewVisible && "visible",
          )}
          onClick={requestClose}
        ></div>
      )}
      {isAudio ? (
        <AudioPreview
          key={`${filePath}:${previewVisible}`}
          isVisible={previewVisible}
          filePath={localPath}
          onPrev={navPrev}
          onNext={navNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onDelete={onDelete}
        />
      ) : (
        <div
          className={classNames(
            "preview_container",
            !windowed && "shadow",
            isBig && "image",
            (previewVisible || windowed) && "visible",
            interacting && "interacting",
            maximized && "maximized",
            windowed && "windowed",
          )}
          // Windowed mode fills the native window (positioned by CSS); only the in-app panel is
          // free-floating and driven by the geometry hook.
          style={windowed ? undefined : panelStyle}
        >
          {/* The native window titlebar is the header in windowed mode (title + close); the custom
              draggable header is only for the in-app floating panel. */}
          {!windowed && (
            <div
              className={classNames(
                "preview_header",
                "draggable",
                mac && "mac",
              )}
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
          )}

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
              isImage && "image",
              isVideo && "video",
              isPdf && "pdf",
            )}
          >
            {isReady ? (
              isMarkdown ? (
                editMode ? (
                  <TextArea
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
              ) : isImage ? (
                <ZoomableImage
                  key={filePath}
                  src={convertFileSrc(localPath)}
                  alt={filePath}
                  onContextMenu={handleImageContextMenu}
                  zoom={zoom}
                  rotation={rotation}
                  pan={pan}
                  onZoomTo={zoomTo}
                  onPanChange={setPan}
                />
              ) : isVideo ? (
                <video
                  ref={videoRef}
                  src={convertFileSrc(localPath)}
                  controls
                  autoPlay
                />
              ) : isPdf ? (
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
          <PreviewControls
            onPrev={navPrev}
            onNext={navNext}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onDelete={onDelete}
          >
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
              <>
                {IMAGE_ROTATION_ACTIONS.map(({ direction, label }) => (
                  <IconButton
                    key={label}
                    icon={direction < 0 ? faRotateLeft : faRotateRight}
                    onClick={() => rotate(direction)}
                    disabled={!isReady}
                    tooltip={t.imagePreview[label]}
                    aria-label={t.imagePreview[label]}
                  />
                ))}
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
              </>
            )}
          </PreviewControls>

          {!windowed && <PreviewResizeHandles bind={resizeBind} />}
        </div>
      )}

      <ContextMenu contextMenuVisible={imageMenuVisible} ref={imageMenuRef}>
        {IMAGE_COPY_ACTIONS.filter(
          ({ currentState }) => !currentState || rotation !== 0,
        ).map(({ label, currentState }) => (
          <ContextMenuItem
            key={label}
            text={t.contextMenu[label]}
            icon={<Icon icon={faCopy} />}
            disabled={!localPath}
            onClick={() => handleCopyImage(currentState)}
          />
        ))}
      </ContextMenu>
    </>
  );
};

export default Preview;
