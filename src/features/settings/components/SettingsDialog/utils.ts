import { DATE_FORMAT_LOCALE } from "@/shared/constants";

import type { SettingDescriptor } from "../../schema";
import { DATE_FORMAT_PRESETS } from "./constants";

// Whether a stored date format is one of the built-in choices (the locale sentinel or a preset),
// as opposed to a user-entered custom pattern. Drives whether the dropdown shows "Custom…" and
// reveals the pattern input.
export const isPresetDateFormat = (format: string) =>
  format === DATE_FORMAT_LOCALE || DATE_FORMAT_PRESETS.includes(format);

// Whether a setting matches the search query (case-insensitive over its label + hint). `query`
// is expected already lower-cased.
export const matchesQuery = (descriptor: SettingDescriptor, query: string) =>
  `${descriptor.label()} ${descriptor.hint()}`.toLowerCase().includes(query);
