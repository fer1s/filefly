import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { useConfirm } from "@/shared/providers/ConfirmProvider";
import { KEY } from "@/shared/constants";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";

import { MARKDOWN_MODE, type MarkdownMode } from "./constants";
import { highlightMatches } from "./utils";
import type { MarkdownDoc } from "./types";

// All markdown-preview state: loading the doc, the preview/edit mode toggle, save + dirty tracking,
// and the in-app find (Cmd/Ctrl+F) that works in both modes. Refs are returned for the view to
// attach to the textarea / rendered container / find input.
export const useMarkdownPreview = ({
  filePath,
  savePath,
  isMarkdown,
  previewVisible,
}: {
  // Path read/rendered — for a remote file this is the local cache copy.
  filePath: string;
  // Path saved to on Cmd+S — the original (a remote `sftp://` path writes back to the server; the
  // backend routes it). Defaults to filePath for local files.
  savePath: string;
  isMarkdown: boolean;
  previewVisible: boolean;
}) => {
  const { fs } = useStateContext();
  const { confirm } = useConfirm();

  const [doc, setDoc] = useState<MarkdownDoc | null>(null);
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>(
    MARKDOWN_MODE.PREVIEW,
  );
  const [saving, setSaving] = useState(false);

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
      // Write to the original path — a remote one saves back to the server (backend routes it).
      await fs.writeText(savePath, doc.draft);
      // For a remote file, keep the local cache copy (doc.path) in sync so a re-open isn't stale.
      if (savePath !== doc.path) await fs.writeText(doc.path, doc.draft);
      setDoc((d) => (d && d.path === doc.path ? { ...d, source: d.draft } : d));
      notify(t.common.saved, TOAST_TYPE.SUCCESS);
    } catch (err) {
      notify(t.errors.save(String(err)), TOAST_TYPE.ERROR);
    } finally {
      setSaving(false);
    }
  }, [doc, dirty, saving, fs, savePath]);

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
      setMatchIndex(
        (i) => (((i + delta) % matchCount) + matchCount) % matchCount,
      );
    },
    [matchCount],
  );

  const onQueryChange = useCallback((value: string) => {
    setFindQuery(value);
    setMatchIndex(0);
  }, []);

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

  return {
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
  };
};
