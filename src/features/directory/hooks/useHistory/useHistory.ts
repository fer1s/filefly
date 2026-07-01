import { useCallback, useRef, useState } from "react";

import type { HistoryEntry } from "./types";

// Undo/redo stack for reversible filesystem actions. Recording a new action clears the redo
// branch (standard linear-history semantics). undo()/redo() run the entry's async reverse/replay
// and move it to the other stack; a busy guard prevents overlapping runs from a key-repeat. They
// return the entry that ran (for the caller's toast) or null when there was nothing to do; a
// throwing entry propagates so the caller can surface the failure, and the entry is dropped rather
// than left to wedge the stack.
export const useHistory = () => {
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const busy = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const record = useCallback(
    (entry: HistoryEntry) => {
      undoStack.current.push(entry);
      redoStack.current = [];
      sync();
    },
    [sync],
  );

  const undo = useCallback(async (): Promise<HistoryEntry | null> => {
    if (busy.current) return null;
    const entry = undoStack.current.pop();
    sync();
    if (!entry) return null;
    busy.current = true;
    try {
      await entry.undo();
      redoStack.current.push(entry);
      return entry;
    } finally {
      busy.current = false;
      sync();
    }
  }, [sync]);

  const redo = useCallback(async (): Promise<HistoryEntry | null> => {
    if (busy.current) return null;
    const entry = redoStack.current.pop();
    sync();
    if (!entry) return null;
    busy.current = true;
    try {
      await entry.redo();
      undoStack.current.push(entry);
      return entry;
    } finally {
      busy.current = false;
      sync();
    }
  }, [sync]);

  return { record, undo, redo, canUndo, canRedo };
};
