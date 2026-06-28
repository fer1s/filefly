// Coalesce bursts of filesystem events (a single move fires several) into one refresh.
export const DIRECTORY_WATCH_DEBOUNCE_MS = 150;
