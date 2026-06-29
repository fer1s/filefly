import { useEffect, useRef } from "react";

import { classNames } from "@/shared/utils";
import { KEY } from "@/shared/constants";

import "@/styles/components/Dialog.css";

import type { DialogProps } from "./types";

// Tabbable elements inside the dialog (skips those explicitly removed from the tab order).
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Dialog = ({
  visible,
  onClose,
  children,
  className,
  labelledBy,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);

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
        )}
        role="dialog"
        aria-modal="true"
        aria-hidden={!visible}
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={dialogRef}
      >
        {children}
      </div>
    </>
  );
};

export default Dialog;
