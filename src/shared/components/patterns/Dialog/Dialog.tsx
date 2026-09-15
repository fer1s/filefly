import { useEffect, useId, useState } from "react";
import { useDrag } from "@use-gesture/react";
import { Dialog as SitoDialog } from "@sito/ui";

import { classNames } from "@/shared/utils";
import { HOTKEY_SCOPE, useHotkeyScope } from "@/shared/keymap";
import { useModal } from "@/shared/providers/ModalProvider";

import "@/styles/components/Dialog.css";

import {
  DIALOG_DRAG_X_CSS_VAR,
  DIALOG_DRAG_Y_CSS_VAR,
  DIALOG_EXIT_DURATION_MS,
  DIALOG_ID_PREFIX,
  DIALOG_INITIAL_FOCUS,
} from "./constants";
import { DialogDragContext } from "./dragContext";
import type { DialogProps } from "./types";

const Dialog = ({
  visible,
  title,
  onClose,
  children,
  className,
}: DialogProps) => {
  const dialogId = `${DIALOG_ID_PREFIX}-${useId()}`;
  const { open: registerModal, close: unregisterModal } = useModal();

  // Drag-by-header: the dialog can be moved around the viewport by grabbing its title bar. The
  // offset composes with the centring translate via CSS vars (see Dialog.css). The binder is handed
  // to DialogHeader through context so only the header captures the drag, never the body.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  // @sito/ui mounts an open dialog directly. Hold the local `visible` class for one frame so the
  // existing opacity/scale transition still has a real start state to animate from.
  const [entry, setEntry] = useState({ visible, entered: false });
  if (entry.visible !== visible) setEntry({ visible, entered: false });
  useEffect(() => {
    if (!visible || entry.entered) return;
    const frame = window.requestAnimationFrame(() =>
      setEntry((current) =>
        current.visible ? { ...current, entered: true } : current,
      ),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [visible, entry.entered]);
  const animationVisible = visible && entry.entered;

  // Recentre each time the dialog (re)opens — derive from the visible prop by comparing to state
  // during render (React's sanctioned "adjust state on prop change" pattern; no ref/effect).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setOffset({ x: 0, y: 0 });
  }

  const dragBind = useDrag(
    ({ event, movement: [mx, my], first, last, memo, cancel }) => {
      // Don't move when the grab starts on the close control (or any interactive header element).
      if (
        first &&
        (event.target as HTMLElement).closest(
          "button, a, input, textarea, select, .mac_close",
        )
      ) {
        cancel();
        return;
      }
      // `memo` is undefined when the first event cancelled (grab landed on a button/close): the
      // trailing pointerup still fires a callback, so guard against a missing base instead of
      // dereferencing it. A cancelled gesture simply doesn't move the dialog.
      const base = (first ? offset : memo) as
        { x: number; y: number } | undefined;
      if (!base) return;
      setOffset({ x: base.x + mx, y: base.y + my });
      setDragging(!last);
      return base;
    },
    // filterTaps keeps a plain click on the header from registering as a 0px drag; keys:false
    // disables @use-gesture's arrow-key dragging on the focused header.
    { filterTaps: true, pointer: { keys: false } },
  );

  // Activate the MODAL hotkey scope while open: the dispatcher then suppresses every lower-scope
  // hotkey (clipboard, tabs, zoom, history nav, …), so keymap actions can't leak to the directory
  // behind the dialog. Centralised here so every dialog gets it, not just those using Escape-close.
  useHotkeyScope(HOTKEY_SCOPE.MODAL, visible);

  // Mark a modal as open while visible so non-keymap keyboard handlers (the directory's raw arrow /
  // type-to-find listener) also stand down. The backdrop already blocks the mouse.
  useEffect(() => {
    if (!visible) return;
    registerModal();
    return unregisterModal;
  }, [visible, registerModal, unregisterModal]);

  // @sito/ui owns the portal/focus lifecycle but intentionally does not expose its internal ref.
  // Keep the Tauri-only draggable-window behavior by writing the existing drag variables onto the
  // package dialog identified by its stable id.
  useEffect(() => {
    const dialog = document.getElementById(dialogId);
    if (!dialog) return;
    dialog.style.setProperty(DIALOG_DRAG_X_CSS_VAR, `${offset.x}px`);
    dialog.style.setProperty(DIALOG_DRAG_Y_CSS_VAR, `${offset.y}px`);
  }, [dialogId, offset, visible]);

  return (
    <SitoDialog
      dialogId={dialogId}
      open={visible}
      title={title}
      onClose={onClose}
      initialFocus={DIALOG_INITIAL_FOCUS}
      closeOnBackdropClick
      closeOnEscape
      lockBodyScroll={false}
      showCloseButton={false}
      exitDurationMs={DIALOG_EXIT_DURATION_MS}
      containerClassName={classNames(
        "dialog_backdrop",
        animationVisible && "visible",
      )}
      className={classNames(
        "dialog",
        "shadow",
        className,
        animationVisible && "visible",
        dragging && "dragging",
      )}
    >
      <DialogDragContext.Provider value={dragBind}>
        {children}
      </DialogDragContext.Provider>
    </SitoDialog>
  );
};

export default Dialog;
