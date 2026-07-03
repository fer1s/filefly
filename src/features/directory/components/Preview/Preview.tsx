import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useDrag } from "@use-gesture/react";

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
import { KEY } from "@/shared/constants";
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
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { t } from "@/lang";

import AudioPreview from "../AudioPreview";
import { useContextMenu } from "../../hooks/useContextMenu";

import { ZoomableImage } from "./ZoomableImage";
import { useImageZoom } from "./useImageZoom";
import {
  IMAGE_ZOOM_MIN,
  IMAGE_ZOOM_MAX,
  IMAGE_ZOOM_BUTTON_STEP,
  MARKDOWN_MODE,
  type MarkdownMode,
} from "./constants";

import {
  faChevronLeft,
  faChevronRight,
  faChevronUp,
  faChevronDown,
  faCopy,
  faTrash,
  faPen,
  faEye,
  faFloppyDisk,
  faXmark,
  faMagnifyingGlass,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/Preview.css";

import type { PreviewProps } from "./types";

// Wrap every case-insensitive occurrence of `query` in `<mark class="preview_find_hit">` within the
// rendered element's text nodes. Returns the number of matches. Assumes the element holds clean
// HTML (no prior marks) — callers reset innerHTML before each run.
const highlightMatches = (root: HTMLElement, query: string): number => {
  const needle = query.toLowerCase();
  if (!needle) return 0;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    textNodes.push(n as Text);

  let count = 0;
  for (const node of textNodes) {
    const text = node.nodeValue ?? "";
    const lower = text.toLowerCase();
    if (!lower.includes(needle)) continue;
    const frag = document.createDocumentFragment();
    let pos = 0;
    for (
      let idx = lower.indexOf(needle);
      idx !== -1;
      idx = lower.indexOf(needle, pos)
    ) {
      if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement("mark");
      mark.className = "preview_find_hit";
      mark.textContent = text.slice(idx, idx + needle.length);
      frag.appendChild(mark);
      count += 1;
      pos = idx + needle.length;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode?.replaceChild(frag, node);
  }
  return count;
};

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
  const { confirm } = useConfirm();
  const {
    ref: imageMenuRef,
    visible: imageMenuVisible,
    openAt: openImageMenu,
    setVisible: setImageMenuVisible,
  } = useContextMenu();

  const mac = isMacPlatform();
  const isImage = IMAGE_FORMATS.includes(fileType);

  // Drag-by-header: move the floating preview around the viewport by grabbing its title bar. The
  // offset composes with the container's show transform via CSS vars (see Preview.css).
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  // Recentre each time the preview (re)opens — derived from the prop by comparing to state during
  // render (no ref/effect, to satisfy the strict hooks lint).
  const [wasVisible, setWasVisible] = useState(previewVisible);
  if (previewVisible !== wasVisible) {
    setWasVisible(previewVisible);
    if (previewVisible) setDragOffset({ x: 0, y: 0 });
  }
  const dragBind = useDrag(
    ({ event, movement: [mx, my], first, last, memo, cancel }) => {
      if (
        first &&
        (event.target as HTMLElement).closest(
          "button, a, input, textarea, select, .mac_close",
        )
      ) {
        cancel();
        return;
      }
      const base = (first ? dragOffset : memo) as { x: number; y: number };
      setDragOffset({ x: base.x + mx, y: base.y + my });
      setDragging(!last);
      return base;
    },
    { filterTaps: true, pointer: { keys: false } },
  );
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

  const isMarkdown = fileType === MARKDOWN_FORMAT;

  // The loaded markdown document: raw `source` (last saved on disk), the editable `draft`, and the
  // rendered `html` of the draft shown in preview mode. Keyed by `path` so a stale async load for a
  // previous file never leaks into the current one.
  const [doc, setDoc] = useState<{
    path: string;
    source: string;
    draft: string;
    html: string;
  } | null>(null);
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>(
    MARKDOWN_MODE.PREVIEW,
  );
  const [saving, setSaving] = useState(false);

  // Find (Cmd/Ctrl+F), available in both modes. In edit mode it navigates the raw draft via the
  // textarea selection; in preview mode it wraps matches in <mark> inside the rendered HTML. Focus
  // stays in the find input the whole time so Enter can cycle matches without interruption.
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  const docReady = doc?.path === filePath;
  const dirty = isMarkdown && docReady && doc.draft !== doc.source;
  const editMode = markdownMode === MARKDOWN_MODE.EDIT;

  // Edit-mode matches: start offsets of every non-overlapping, case-insensitive hit in the draft.
  const editMatches = useMemo(() => {
    if (!findQuery || !doc) return [];
    const needle = findQuery.toLowerCase();
    const hay = doc.draft.toLowerCase();
    const out: number[] = [];
    for (
      let i = hay.indexOf(needle);
      i !== -1;
      i = hay.indexOf(needle, i + needle.length)
    )
      out.push(i);
    return out;
  }, [findQuery, doc]);

  // Preview-mode match count, derived (not stored) so the render stays a pure function of state.
  // Runs the same highlighter on a detached clone, so the count always equals the marks the effect
  // actually creates in the live DOM.
  const previewMatchCount = useMemo(() => {
    if (editMode || !findOpen || !findQuery || !doc) return 0;
    const tmp = document.createElement("div");
    tmp.innerHTML = doc.html;
    return highlightMatches(tmp, findQuery);
  }, [editMode, findOpen, findQuery, doc]);

  const matchCount = editMode ? editMatches.length : previewMatchCount;

  // Load raw source + initial render whenever a markdown file opens. Read errors surface as the
  // preview body so the modal still resolves instead of hanging on the spinner.
  useEffect(() => {
    if (!previewVisible || !isMarkdown) return;

    let cancelled = false;
    (async () => {
      try {
        const source = await fs.readText(filePath);
        const html = await fs.renderMarkdown(source);
        if (!cancelled) setDoc({ path: filePath, source, draft: source, html });
      } catch (err) {
        if (!cancelled)
          setDoc({
            path: filePath,
            source: "",
            draft: "",
            html: `<p>${t.errors.read(String(err))}</p>`,
          });
      }
      if (!cancelled) {
        setMarkdownMode(MARKDOWN_MODE.PREVIEW);
        setFindOpen(false);
        setFindQuery("");
        setMatchIndex(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, isMarkdown, fs, previewVisible]);

  const isReady = !isMarkdown || docReady;

  // Ask before throwing away unsaved edits (returns true = safe to proceed). Guards every exit from
  // an edited document: close, backdrop, prev/next navigation.
  const confirmDiscard = useCallback(async () => {
    if (!dirty) return true;
    return confirm({
      title: t.markdownEditor.unsavedTitle,
      message: t.markdownEditor.unsavedMessage,
      confirmLabel: t.markdownEditor.discard,
      destructive: true,
    });
  }, [dirty, confirm]);

  const requestClose = useCallback(async () => {
    if (await confirmDiscard()) setPreviewVisible(false);
  }, [confirmDiscard, setPreviewVisible]);

  const handleDraftChange = useCallback(
    (value: string) => setDoc((d) => (d ? { ...d, draft: value } : d)),
    [],
  );

  // Re-render the draft when flipping back to preview so it reflects unsaved edits.
  const showPreview = useCallback(async () => {
    if (doc) {
      const html = await fs.renderMarkdown(doc.draft);
      setDoc((d) => (d && d.path === doc.path ? { ...d, html } : d));
    }
    setMarkdownMode(MARKDOWN_MODE.PREVIEW);
    setMatchIndex(0);
  }, [doc, fs]);

  // Enter edit mode (from the pill toggle); reset the active match so find re-anchors to the draft.
  const enterEdit = useCallback(() => {
    setMarkdownMode(MARKDOWN_MODE.EDIT);
    setMatchIndex(0);
  }, []);

  const save = useCallback(async () => {
    if (!doc || !dirty || saving) return;
    setSaving(true);
    try {
      await fs.writeText(doc.path, doc.draft);
      setDoc((d) => (d && d.path === doc.path ? { ...d, source: d.draft } : d));
      notify(t.common.saved, TOAST_TYPE.SUCCESS);
    } catch (err) {
      notify(t.errors.save(String(err)), TOAST_TYPE.ERROR);
    } finally {
      setSaving(false);
    }
  }, [doc, dirty, saving, fs]);

  const openFind = useCallback(() => {
    setFindOpen(true);
    setMatchIndex(0);
    // Focus + select any existing query so the user can type over it immediately.
    requestAnimationFrame(() => findInputRef.current?.select());
  }, []);

  const closeFind = useCallback(() => {
    setFindOpen(false);
    if (editMode) editorRef.current?.focus();
  }, [editMode]);

  const toggleFind = useCallback(() => {
    if (findOpen) closeFind();
    else openFind();
  }, [findOpen, closeFind, openFind]);

  // Move the active match (wrapping). The reveal/highlight effects react to matchIndex, so this
  // never touches the textarea focus — the find input keeps focus and Enter can cycle freely.
  const goToMatch = useCallback(
    (delta: number) => {
      if (!matchCount) return;
      setMatchIndex((i) => (((i + delta) % matchCount) + matchCount) % matchCount);
    },
    [matchCount],
  );

  const handleFindKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === KEY.ENTER) {
        e.preventDefault();
        goToMatch(e.shiftKey ? -1 : 1);
      }
    },
    [goToMatch],
  );

  // Edit-mode reveal: select + scroll the active match in the textarea WITHOUT focusing it (the
  // browser paints an unfocused selection in muted grey), so the find input keeps focus.
  useEffect(() => {
    if (!findOpen || !editMode) return;
    const ta = editorRef.current;
    const start = editMatches[matchIndex];
    if (!ta || start == null) return;
    ta.setSelectionRange(start, start + findQuery.length);
    const line = doc?.draft.slice(0, start).split("\n").length ?? 1;
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    ta.scrollTop = Math.max(0, (line - 1) * lineHeight - ta.clientHeight / 2);
  }, [findOpen, editMode, matchIndex, editMatches, findQuery, doc]);

  // Preview-mode find: wrap every match in <mark> inside the rendered HTML, flag the active one and
  // scroll it into view. Rebuilding resets the container's scroll, so the reveal must happen in the
  // same pass — hence one effect keyed on the query, the doc AND the active index (navigating just
  // re-runs it; setPreviewMatchCount to the same value is a no-op, so there's no render loop).
  useEffect(() => {
    if (editMode) return;
    const el = contentRef.current;
    if (!el) return;
    el.innerHTML = doc?.html ?? "";
    if (!findOpen || !findQuery) return;
    const count = highlightMatches(el, findQuery);
    if (!count) return;
    const active = (((matchIndex % count) + count) % count) | 0;
    const marks = el.querySelectorAll("mark.preview_find_hit");
    marks.forEach((m, i) => m.classList.toggle("active", i === active));
    marks[active]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [editMode, findOpen, findQuery, doc, matchIndex]);

  // Navigation guarded by the unsaved-edits prompt (prev/next would otherwise swap the file out
  // from under an in-progress edit).
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
  // editor textarea.
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
            (IMAGE_FORMATS.includes(fileType) ||
              VIDEO_FORMATS.includes(fileType) ||
              fileType === PDF_FORMAT) &&
              "image",
            previewVisible && "visible",
            dragging && "dragging",
          )}
          style={
            {
              "--preview-drag-x": `${dragOffset.x}px`,
              "--preview-drag-y": `${dragOffset.y}px`,
            } as CSSProperties
          }
        >
          <div
            className={classNames("preview_header", "draggable", mac && "mac")}
            {...dragBind()}
          >
            {mac && <CloseButton onClose={requestClose} />}
            <h4>
              {dirty && <span className="preview_dirty_dot" aria-hidden />}
              {isMarkdown && markdownMode === MARKDOWN_MODE.EDIT
                ? t.common.edit
                : t.common.preview}
            </h4>
            {!mac && <CloseButton onClose={requestClose} />}
          </div>
          {isMarkdown && docReady && findOpen && (
            <div className="preview_find">
              <input
                ref={findInputRef}
                className="preview_find_input"
                value={findQuery}
                onChange={(e) => {
                  setFindQuery(e.target.value);
                  setMatchIndex(0);
                }}
                onKeyDown={handleFindKeyDown}
                placeholder={t.markdownEditor.findPlaceholder}
                spellCheck={false}
                autoFocus
              />
              <span className="preview_find_count">
                {matchCount
                  ? `${Math.min(matchIndex, matchCount - 1) + 1}/${matchCount}`
                  : findQuery
                    ? t.markdownEditor.noResults
                    : ""}
              </span>
              <IconButton
                icon={faChevronUp}
                onClick={() => goToMatch(-1)}
                disabled={!matchCount}
                tooltip={t.markdownEditor.previousMatch}
                aria-label={t.markdownEditor.previousMatch}
              />
              <IconButton
                icon={faChevronDown}
                onClick={() => goToMatch(1)}
                disabled={!matchCount}
                tooltip={t.markdownEditor.nextMatch}
                aria-label={t.markdownEditor.nextMatch}
              />
              <IconButton
                icon={faXmark}
                onClick={closeFind}
                tooltip={t.common.close}
                aria-label={t.common.close}
              />
            </div>
          )}
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
                markdownMode === MARKDOWN_MODE.EDIT ? (
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
