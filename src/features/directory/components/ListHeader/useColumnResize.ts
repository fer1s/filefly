import { useRef, useState } from "react";
import { useDrag } from "@use-gesture/react";

import type { SortKey } from "@/features/directory/constants";
import type { ColumnWidths } from "../../columns";

import { LIST_COLUMN_MIN_WIDTH } from "./constants";
import { ResizeSnapshot } from "./types";

// Draggable dividers between visible list columns. A drag grows the column on the left and shrinks
// its neighbour by the same amount, keeping the total grid width stable. The measured pixel widths
// become relative `fr` weights in buildListGrid, so the resulting proportions remain responsive.
export const useColumnResize = (
  visibleColumns: SortKey[],
  onWidthsChange: (widths: ColumnWidths) => void,
) => {
  const headerRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);

  const bindResize = useDrag(
    ({ args: [leftArg], movement: [mx], first, last, memo, tap, event }) => {
      if (tap) return memo;

      const left = leftArg as SortKey;
      const leftIndex = visibleColumns.indexOf(left);
      const right = visibleColumns[leftIndex + 1];
      if (leftIndex < 0 || !right) {
        setResizing(false);
        return memo;
      }

      let base = memo as ResizeSnapshot | undefined;
      if (first || !base) {
        const widths: ColumnWidths = {};
        for (const key of visibleColumns) {
          const element = headerRef.current?.querySelector<HTMLElement>(
            `[data-column="${key}"]`,
          );
          if (!element) {
            setResizing(false);
            return memo;
          }
          widths[key] = element.getBoundingClientRect().width;
        }
        base = { widths, left, right };
      }

      const leftWidth = base.widths[base.left];
      const rightWidth = base.widths[base.right];
      if (leftWidth === undefined || rightWidth === undefined) return base;

      const delta = Math.max(
        LIST_COLUMN_MIN_WIDTH - leftWidth,
        Math.min(mx, rightWidth - LIST_COLUMN_MIN_WIDTH),
      );
      onWidthsChange({
        ...base.widths,
        [base.left]: leftWidth + delta,
        [base.right]: rightWidth - delta,
      });
      setResizing(!last);
      event.preventDefault();
      event.stopPropagation();
      window.getSelection?.()?.removeAllRanges();
      return base;
    },
    { axis: "x", filterTaps: true, pointer: { keys: false } },
  );

  return { headerRef, bindResize, resizing };
};
