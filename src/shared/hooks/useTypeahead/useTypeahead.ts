import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { TYPEAHEAD_RESET_MS } from "./constants";
import type { UseTypeaheadArgs, UseTypeaheadResult } from "./types";

// Type-to-find buffer: accumulates typed characters, resets after TYPEAHEAD_RESET_MS of quiet, and
// lets Backspace edit it. Matching stays with the caller (see utils) because each surface owns its
// own selection state. Every returned function is stable, so callers can use them in effect deps.
export const useTypeahead = ({
  onChange,
}: UseTypeaheadArgs): UseTypeaheadResult => {
  const bufferRef = useRef("");
  const timerRef = useRef<number | null>(null);

  // Latest callback without re-creating the API (and re-running callers' effects) on every render.
  const onChangeRef = useRef(onChange);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    bufferRef.current = "";
    onChangeRef.current("");
  }, []);

  const scheduleReset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(clear, TYPEAHEAD_RESET_MS);
  }, [clear]);

  const push = useCallback(
    (char: string) => {
      const current = bufferRef.current;
      const repeatedSingleChar =
        current.length === 1 && current.toLowerCase() === char.toLowerCase();
      const next = repeatedSingleChar ? current : current + char;
      bufferRef.current = next;
      onChangeRef.current(next);
      scheduleReset();
      return next.toLowerCase();
    },
    [scheduleReset],
  );

  const backspace = useCallback(() => {
    if (!bufferRef.current) return null;
    const next = bufferRef.current.slice(0, -1);
    bufferRef.current = next;
    onChangeRef.current(next);
    if (!next) clear();
    else scheduleReset();
    return next.toLowerCase();
  }, [clear, scheduleReset]);

  const isActive = useCallback(() => bufferRef.current !== "", []);

  // Never leave a pending reset firing into an unmounted owner.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useMemo(
    () => ({ push, backspace, clear, isActive }),
    [push, backspace, clear, isActive],
  );
};
