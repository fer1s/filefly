import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { StateProvider, initialState } from "@/shared/providers/StateProvider";
import { ModalProvider } from "@/shared/providers/ModalProvider";
import { ConfirmProvider } from "@/shared/providers/ConfirmProvider";
import { KeymapProvider, HotkeyProvider } from "@/shared/keymap";
import ToastStack from "@/shared/components/patterns/ToastStack";

import { useToasts } from "@/app/hooks/useToasts";
import { useTheme } from "@/app/hooks/useTheme";
import { useAccent } from "@/app/hooks/useAccent";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { getSettings } from "@/shared/services/api";
import { DEFAULT_SETTINGS, type Theme, type Accent } from "@/shared/constants";
import { basename, dirname, extension } from "@/shared/utils";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import type { DirEntry } from "@/shared/models";
import type { AppSettings } from "@/shared/services/api";

import { ACCEPTED_PREVIEW_FORMATS } from "../../constants";
import { usePreview } from "../../hooks/usePreview";

import Preview from "./Preview";

// Root of a detached preview window (see the openPreviewInWindow setting). The window IS the
// preview: it lists the target file's folder for prev/next siblings, opens the target, and closes
// itself when the preview is dismissed. Runs a minimal provider shell — just what the Preview
// subtree reads (fs via StateProvider, confirm via ConfirmProvider, hotkeys, toasts) rather than
// the full App.
const PreviewWindow = ({ target }: { target: string }) => {
  const fs = useMemo(() => new FileSystemManager(), []);
  const state = useMemo(() => ({ ...initialState, fs }), [fs]);
  const { toasts, dismissToast } = useToasts();

  // Match the main window's appearance: theme/accent and the surface-opacity variables the Preview
  // (controls pill, image context menu, discard-edits dialog) reads. Loaded from settings.toml;
  // falls back to defaults until it resolves.
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => {
        /* keep defaults — appearance only */
      });
  }, []);
  useTheme(settings.theme as Theme);
  useAccent(settings.accentColor as Accent);
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--dialog-opacity", String(settings.dialogOpacity));
    root.setProperty(
      "--preview-controls-opacity",
      String(settings.previewControlsOpacity),
    );
    root.setProperty(
      "--context-menu-opacity",
      String(settings.contextMenuOpacity),
    );
  }, [
    settings.dialogOpacity,
    settings.previewControlsOpacity,
    settings.contextMenuOpacity,
  ]);

  // The previewable siblings in the target's folder, so prev/next navigates the folder just like
  // the in-app preview. Re-listed after a delete so the list (and prev/next) stays live.
  const parent = useMemo(() => dirname(target), [target]);
  const [previewables, setPreviewables] = useState<DirEntry[]>([]);
  const loadSiblings = useCallback(async () => {
    try {
      const entries = await fs.readDirectory(parent);
      setPreviewables(
        entries.filter(
          (e) =>
            !e.metadata.isDir &&
            ACCEPTED_PREVIEW_FORMATS.includes(extension(e.name)),
        ),
      );
    } catch (err) {
      notify(t.errors.read(String(err)), TOAST_TYPE.ERROR);
    }
  }, [fs, parent]);
  useEffect(() => {
    // Async listing of the target's folder — syncing React to an external system (the filesystem),
    // the intended use of an effect; setState lands in the resolved promise, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSiblings();
  }, [loadSiblings]);

  const preview = usePreview(previewables);
  const { open, visible, filePath } = preview;

  // Open the target once its folder has been listed (open() locates it among the siblings) and
  // reveal the window. One-shot — afterwards the window follows the user's prev/next navigation.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || previewables.length === 0) return;
    opened.current = true;
    open(target);
    const win = getCurrentWindow();
    void win.show();
    void win.setFocus();
  }, [previewables.length, open, target]);

  // Dismissing the preview (Escape / close button / backdrop) closes the whole window — guarded by
  // `opened` so the initial visible=false doesn't close it before it ever opens.
  useEffect(() => {
    if (opened.current && !visible) void getCurrentWindow().close();
  }, [visible]);

  // The native titlebar is the preview's header (the in-app custom header is dropped in windowed
  // mode), so name the window after the file — kept in sync as prev/next changes it.
  useEffect(() => {
    if (filePath) void getCurrentWindow().setTitle(basename(filePath));
  }, [filePath]);

  // Trash the shown file, then re-list so prev/next advances to the next sibling (usePreview clamps
  // the index to the shrunk list; an emptied list drops `visible`, which closes the window). Moves
  // to the Trash directly — the detached window has no confirm-delete flow.
  const handleDelete = useCallback(async () => {
    if (!filePath) return;
    try {
      await fs.trash(filePath);
      await loadSiblings();
    } catch (err) {
      notify(
        t.errors.delete(basename(filePath), String(err)),
        TOAST_TYPE.ERROR,
      );
    }
  }, [fs, filePath, loadSiblings]);

  return (
    <StateProvider value={state}>
      <ModalProvider>
        <KeymapProvider>
          <HotkeyProvider>
            <ConfirmProvider>
              <div
                className="preview_window"
                style={
                  {
                    "--preview-controls-opacity":
                      settings.previewControlsOpacity,
                    "--context-menu-opacity": settings.contextMenuOpacity,
                  } as CSSProperties
                }
              >
                <Preview
                  fileType={preview.fileType}
                  filePath={preview.filePath}
                  previewVisible={preview.visible}
                  setPreviewVisible={preview.setVisible}
                  onPrev={preview.prev}
                  onNext={preview.next}
                  hasPrev={preview.hasPrev}
                  hasNext={preview.hasNext}
                  onDelete={handleDelete}
                  windowed
                />
              </div>
            </ConfirmProvider>
          </HotkeyProvider>
        </KeymapProvider>
      </ModalProvider>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </StateProvider>
  );
};

export default PreviewWindow;
