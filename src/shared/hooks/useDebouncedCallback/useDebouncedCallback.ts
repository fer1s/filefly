import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

// A debounced wrapper around `callback`:
//   schedule(...args) — run it after `delay` ms of quiet (each call resets the timer);
//   flush(...args)    — run it immediately, cancelling any pending schedule.
// The latest `callback` is always used (kept in a ref) so it never closes over stale values, and
// the pending timer is cleared on unmount. Generic reusable hook (see ARCHITECTURE_RULES §2, §7):
// keeps debounce/timer logic out of presentational components.
export const useDebouncedCallback = <A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
) => {
  // Keep the latest callback without re-creating schedule/flush. Synced in a layout effect (before
  // paint) so a fire between render and commit never uses a stale callback.
  const callbackRef = useRef(callback);
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });
  const timer = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(
    (...args: A) => {
      clear();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        callbackRef.current(...args);
      }, delay);
    },
    [clear, delay],
  );

  const flush = useCallback(
    (...args: A) => {
      clear();
      callbackRef.current(...args);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { schedule, flush };
};
