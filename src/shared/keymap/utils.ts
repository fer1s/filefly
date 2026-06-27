import { KEY_GLYPH } from "./constants";
import type { KeyBinding } from "./types";

export const isMacPlatform = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

// Whether a keyboard event matches a binding (an undefined binding never matches).
export const matchesBinding = (
  event: KeyboardEvent,
  binding?: KeyBinding,
): boolean => {
  if (!binding) return false;
  if (!!binding.mod !== (event.metaKey || event.ctrlKey)) return false;
  if (!!binding.shift !== event.shiftKey) return false;
  if (!!binding.alt !== event.altKey) return false;
  return binding.keys.some(
    (key) => key.toLowerCase() === event.key.toLowerCase(),
  );
};

// Human-readable representation of a binding's primary key (e.g. "⌘C", "Ctrl+C", "←").
export const formatBinding = (
  binding?: KeyBinding,
  isMac = isMacPlatform(),
): string => {
  if (!binding || binding.keys.length === 0) return "";

  const parts: string[] = [];
  if (binding.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (binding.shift) parts.push(isMac ? "⇧" : "Shift");
  if (binding.alt) parts.push(isMac ? "⌥" : "Alt");

  const key = binding.keys[0];
  parts.push(KEY_GLYPH[key.toLowerCase()] ?? key.toUpperCase());

  return parts.join(isMac ? "" : "+");
};
