import { createContext, useContext } from "react";
import type { useDrag } from "@use-gesture/react";

// The drag binder a Dialog exposes to its DialogHeader so the header becomes the move handle. Bound
// to the header alone (not the whole dialog) so it never competes with controls in the body (e.g.
// the Settings opacity sliders). Null when a header renders outside a draggable Dialog.
export type DialogDragBind = ReturnType<typeof useDrag>;

export const DialogDragContext = createContext<DialogDragBind | null>(null);

export const useDialogDrag = (): DialogDragBind | null =>
  useContext(DialogDragContext);
