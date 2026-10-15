// Aborting stops this preview from consuming a worker's result, not the worker itself.
export const waitForImageOperation = <T>(
  operation: Promise<T>,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<T> => {
  let timer: number;
  let abort: () => void;
  return new Promise<T>((resolve, reject) => {
    abort = () => reject(new Error("Image preview cancelled"));
    timer = window.setTimeout(
      () => reject(new Error("Image preview timed out")),
      timeoutMs,
    );
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    operation.then(resolve, reject);
  }).finally(() => {
    window.clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  });
};
