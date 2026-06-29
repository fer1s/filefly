import { DATE_FORMAT_LOCALE, DEFAULT_DATE_FORMAT } from "@/shared/constants";

// Supported format tokens, matched longest-first so e.g. "YYYY" wins over "YY". Anything that
// isn't a token is emitted literally; wrap literal letters in [brackets] to keep them verbatim
// (e.g. "[at] HH:mm" → "at 14:35").
const TOKEN_PATTERN =
  /\[([^\]]*)\]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|HH|hh|H|h|mm|m|ss|s|A|a/g;

const pad2 = (n: number): string => String(n).padStart(2, "0");

// Build the token → value lookup for a single Date. Month/weekday names are locale-aware.
const tokenValues = (date: Date): Record<string, string> => {
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 || 12;
  return {
    YYYY: String(date.getFullYear()),
    YY: pad2(date.getFullYear() % 100),
    MMMM: date.toLocaleDateString(undefined, { month: "long" }),
    MMM: date.toLocaleDateString(undefined, { month: "short" }),
    MM: pad2(date.getMonth() + 1),
    M: String(date.getMonth() + 1),
    DD: pad2(date.getDate()),
    D: String(date.getDate()),
    dddd: date.toLocaleDateString(undefined, { weekday: "long" }),
    ddd: date.toLocaleDateString(undefined, { weekday: "short" }),
    HH: pad2(hours24),
    H: String(hours24),
    hh: pad2(hours12),
    h: String(hours12),
    mm: pad2(date.getMinutes()),
    m: String(date.getMinutes()),
    ss: pad2(date.getSeconds()),
    s: String(date.getSeconds()),
    A: hours24 < 12 ? "AM" : "PM",
    a: hours24 < 12 ? "am" : "pm",
  };
};

// Format a Date by a token pattern. Exported for the settings live preview.
export const formatWithPattern = (date: Date, pattern: string): string => {
  const values = tokenValues(date);
  return pattern.replace(TOKEN_PATTERN, (match, literal) =>
    // The bracket branch captures the literal text; otherwise look up the token.
    literal !== undefined ? literal : (values[match] ?? match),
  );
};

// Format a Unix epoch (seconds) using the user's chosen format. The DATE_FORMAT_LOCALE sentinel
// falls back to the OS locale string; any other value is treated as a token pattern.
export const formatDate = (
  secs: number,
  format: string = DEFAULT_DATE_FORMAT,
): string => {
  const date = new Date(secs * 1000);
  if (format === DATE_FORMAT_LOCALE) return date.toLocaleString();
  return formatWithPattern(date, format);
};
