import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useDrag } from "@use-gesture/react";

import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";
import { HOTKEY_SCOPE, useHotkeyScope } from "@/shared/keymap";
import { useModal } from "@/shared/providers/ModalProvider";

import "@/styles/components/Dialog.css";

import { FOCUSABLE_SELECTOR } from "./constants";
import { DialogDragContext } from "./dragContext";
import type { DialogProps } from "./types";

const Dialog = ({
  visible,
  onClose,
  children,
  className,
  labelledBy,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { open: registerModal, close: unregisterModal } = useModal();

  // Drag-by-header: the dialog can be moved around the viewport by grabbing its title bar. The
  // offset composes with the centring translate via CSS vars (see Dialog.css). The binder is handed
  // to DialogHeader through context so only the header captures the drag, never the body.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

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

  // While open: move focus inside, trap Tab within the dialog, and restore focus to whatever
  // was focused before when it closes.
  useEffect(() => {
    if (!visible) return;
    const el = dialogRef.current;
    if (!el) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    (focusables()[0] ?? el).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== KEY.TAB) return;
      const items = focusables();
      if (!items.length) {
        event.preventDefault();
        el.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    el.addEventListener("keydown", onKeyDown);
    return () => {
      el.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [visible]);

  return (
    <>
      <div
        className={classNames("dialog_backdrop", visible && "visible")}
        onClick={onClose}
      />
      <div
        className={classNames(
          "dialog",
          "shadow",
          className,
          visible && "visible",
          dragging && "dragging",
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!visible}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={dialogRef}
        style={
          {
            "--dialog-drag-x": `${offset.x}px`,
            "--dialog-drag-y": `${offset.y}px`,
          } as CSSProperties
        }
      >
        <DialogDragContext.Provider value={dragBind}>
          {children}
        </DialogDragContext.Provider>
      </div>
    </>
  );
};

export default Dialog;
