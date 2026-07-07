import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { StateProvider, initialState } from "@/shared/providers/StateProvider";
import ToastStack from "@/shared/components/patterns/ToastStack";

import { useToasts } from "@/app/hooks/useToasts";
import { useTheme } from "@/app/hooks/useTheme";
import { useAccent } from "@/app/hooks/useAccent";
import { FileSystemManager } from "@/shared/managers/FileSystemManager";
import { getSettings } from "@/shared/services/api";
import {
  DEFAULT_SETTINGS,
  KEY,
  type Theme,
  type Accent,
} from "@/shared/constants";
import { notify, TOAST_TYPE } from "@/shared/toast";
import { t } from "@/lang";
import type { DirEntry } from "@/shared/models";
import type { AppSettings } from "@/shared/services/api";

import "@/styles/components/Properties.css";

import { PropertiesContent } from "./PropertiesContent";

// Root of a detached properties window (see the openPropertiesInWindow setting). The window IS the
// properties view: it resolves the target entry's metadata, renders the shared PropertiesContent in
// a minimal provider shell (just what it reads — fs + dateFormat via StateProvider), and closes
// itself on Escape. The native window frame is the chrome, so there's no dialog header.
const PropertiesWindow = ({ target }: { target: string }) => {
  const fs = useMemo(() => new FileSystemManager(), []);
  const { toasts, dismissToast } = useToasts();

  // Match the main window's appearance and date formatting (read by PropertiesContent).
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

  const state = useMemo(
    () => ({ ...initialState, fs, dateFormat: settings.dateFormat }),
    [fs, settings.dateFormat],
  );

  // Resolve the entry once, then reveal the window. Closes the window if the entry can't be read.
  const [entry, setEntry] = useState<DirEntry | null>(null);
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !target) return;
    opened.current = true;
    fs.getEntry(target)
      .then((resolved) => {
        setEntry(resolved);
        void getCurrentWindow().setTitle(
          t.common.propertiesTitle(resolved.name),
        );
        const win = getCurrentWindow();
        void win.show();
        void win.setFocus();
      })
      .catch((err) => {
        notify(t.errors.properties(String(err)), TOAST_TYPE.ERROR);
        void getCurrentWindow().close();
      });
  }, [target, fs]);

  // Focusing the fresh window makes WebKit select-all its text; drop that selection so the rows
  // don't open pre-highlighted (the user can still select to copy). Listening on `focus` (instead
  // of clearing inline after show/setFocus, which are fire-and-forget IPC) wins the race: the
  // select-all happens when the focus actually lands, so it's cleared right after, whenever that
  // is. One-shot, so re-focusing later (Cmd+Tab back) doesn't nuke a selection made to copy.
  useEffect(() => {
    const onFocus = () => window.getSelection()?.removeAllRanges();
    window.addEventListener("focus", onFocus, { once: true });
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Escape closes the window (the native traffic light / Cmd+W also do). Confirm-copy toast mirrors
  // the in-app dialog: the native copy writes the clipboard, this only surfaces the feedback.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEY.ESCAPE) void getCurrentWindow().close();
    };
    const onCopy = () => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) notify(t.common.copied, TOAST_TYPE.SUCCESS);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("copy", onCopy);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("copy", onCopy);
    };
  }, []);

  return (
    <StateProvider value={state}>
      <div className="properties_window">
        {entry && <PropertiesContent entry={entry} />}
      </div>
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </StateProvider>
  );
};

export default PropertiesWindow;
