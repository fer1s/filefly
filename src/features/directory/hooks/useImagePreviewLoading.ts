import { useSyncExternalStore } from "react";

// Tiny module-level store tracking how many image thumbnails are currently
// fetching/decoding. DirEntry rows report start/end imperatively so they don't
// have to subscribe (which would re-render every row on view toggle); only the
// StatusBar subscribes to show the spinner.
let pending = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const imagePreviewLoad = {
  start() {
    pending++;
    emit();
  },
  end() {
    if (pending > 0) {
      pending--;
      emit();
    }
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  get() {
    return pending;
  },
};

export const useImagePreviewLoading = () =>
  useSyncExternalStore(imagePreviewLoad.subscribe, imagePreviewLoad.get);

// Concurrency-limited loader. Opening a folder full of screenshots would
// otherwise kick off every visible thumbnail's fetch + decode at once and jank
// the main thread. Rows request a slot; only MAX_CONCURRENT load at a time and
// the rest stream in as slots free up.
const MAX_CONCURRENT = 4;
let active = 0;
const queue: Array<() => void> = [];

const pump = () => {
  while (active < MAX_CONCURRENT && queue.length > 0) {
    const job = queue.shift()!;
    active++;
    job();
  }
};

// Queue a load. `onGranted` runs when a slot opens up. Returns a release fn the
// caller MUST invoke when the load settles (or the row unmounts) — idempotent.
export const acquireImageSlot = (onGranted: () => void): (() => void) => {
  let started = false;
  let released = false;

  const job = () => {
    started = true;
    onGranted();
  };

  queue.push(job);
  pump();

  return () => {
    if (released) return;
    released = true;
    if (started) {
      active--;
      pump();
    } else {
      const i = queue.indexOf(job);
      if (i >= 0) queue.splice(i, 1);
    }
  };
};
