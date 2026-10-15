export type UseTypeaheadArgs = {
  // Receives the raw buffer (as typed) for display; "" when type-to-find ends.
  onChange: (query: string) => void;
};

export type UseTypeaheadResult = {
  // Append a typed character and return the lowercased query to match. Repeating the same single
  // character keeps the one-char buffer, so callers cycle through entries with that initial.
  push: (char: string) => string;
  // Remove the last typed character. Returns null when no type-to-find is active (the key is not
  // consumed), otherwise the lowercased remaining query ("" once the buffer is emptied).
  backspace: () => string | null;
  // End type-to-find now: drop the buffer and pending reset, and notify `onChange("")`.
  clear: () => void;
  // Whether a type-to-find buffer is currently active.
  isActive: () => boolean;
};

// Anything type-to-find can match by name.
export type TypeaheadItem = {
  name: string;
};
