import { KEY_GLYPH } from "./constants";
import type { KeyBinding, BindingOrList } from "./types";

export const isMacPlatform = (): boolean =>
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

// Whether the event matches one specific chord.
const matchesOne = (event: KeyboardEvent, binding: KeyBinding): boolean => {
  // `ctrl` is literally the Control key (Ctrl+` style); `mod` is the Cmd/Ctrl abstraction,
  // matched loosely as either meta or ctrl. They are mutually exclusive on a binding.
  if (binding.ctrl) {
    if (!event.ctrlKey || event.metaKey) return false;
  } else if (!!binding.mod !== (event.metaKey || event.ctrlKey)) {
    return false;
  }
  if (!!binding.shift !== event.shiftKey) return false;
  if (!!binding.alt !== event.altKey) return false;
  return binding.keys.some((key) => {
    if (key.toLowerCase() === event.key.toLowerCase()) return true;
    // Modifiers change the produced character for digit keys — on macOS Option+1 yields "¡",
    // not "1" — so match digits by physical code too (keeps Opt+N / Cmd+N reliable).
    return (
      /^[0-9]$/.test(key) &&
      (event.code === `Digit${key}` || event.code === `Numpad${key}`)
    );
  });
};

// Whether a keyboard event matches a binding (an undefined binding never matches). A binding may
// be a list of alternative chords, in which case any one matching counts.
export const matchesBinding = (
  event: KeyboardEvent,
  binding?: BindingOrList,
): boolean => {
  if (!binding) return false;
  if (Array.isArray(binding)) return binding.some((b) => matchesOne(event, b));
  return matchesOne(event, binding);
};

// Human-readable representation of a binding's primary key (e.g. "⌘C", "Ctrl+C", "←"). For a list
// of alternatives, the first chord is shown (the canonical one).
export const formatBinding = (
  bindingOrList?: BindingOrList,
  isMac = isMacPlatform(),
): string => {
  const binding = Array.isArray(bindingOrList)
    ? bindingOrList[0]
    : bindingOrList;
  if (!binding || binding.keys.length === 0) return "";

  const parts: string[] = [];
  if (binding.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (binding.mod) parts.push(isMac ? "⌘" : "Ctrl");
  if (binding.shift) parts.push(isMac ? "⇧" : "Shift");
  if (binding.alt) parts.push(isMac ? "⌥" : "Alt");

  const key = binding.keys[0];
  parts.push(KEY_GLYPH[key.toLowerCase()] ?? key.toUpperCase());

  return parts.join(isMac ? "" : "+");
};
