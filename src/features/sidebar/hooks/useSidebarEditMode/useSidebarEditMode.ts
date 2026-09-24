import { useCallback, useEffect, useRef, useState } from "react";

import { useCloseOnEscape } from "@/shared/hooks/useCloseOnEscape";
import { useModal } from "@/shared/providers/ModalProvider";

// Sidebar-wide edit mode: while on, groups expose their "add item" affordances and render with
// dashed outlines. Toggled from the sidebar header; exits on Escape or a press outside the
// sidebar. `ref` must be attached to the sidebar root so the outside-press check knows its bounds.
export const useSidebarEditMode = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const { anyOpen: anyModalOpen } = useModal();

  const exit = useCallback(() => setEditing(false), []);
  const toggle = useCallback(() => setEditing((prev) => !prev), []);

  // A dialog owns Escape and outside presses until it closes; keep sidebar editing underneath.
  useCloseOnEscape(editing && !anyModalOpen, exit);

  // Exit on a press outside the sidebar. Deferred a tick so the toggle's own trailing mousedown
  // doesn't immediately close the mode it just opened.
  useEffect(() => {
    if (!editing || anyModalOpen) return;

    const handlePress = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) exit();
    };

    const id = window.setTimeout(
      () => document.addEventListener("mousedown", handlePress),
      0,
    );

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("mousedown", handlePress);
    };
  }, [editing, anyModalOpen, exit]);

  return { ref, editing, toggle, exit };
};
