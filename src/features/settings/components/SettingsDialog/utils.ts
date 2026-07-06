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

// A run of settings under one (optional) sub-heading.
export type Subgroup = { title: string | null; items: SettingDescriptor[] };

// Split a section's settings into subsection groups, preserving schema order. Items sharing a
// resolved `subsection` label cluster together; items without one fall under a leading title-less
// group. Groups appear in the order their subsection is first seen (so authoring the schema in
// subsection order yields the intended layout).
export const groupBySubsection = (items: SettingDescriptor[]): Subgroup[] => {
  const groups: Subgroup[] = [];
  const byTitle = new Map<string, Subgroup>();
  for (const descriptor of items) {
    const title = descriptor.subsection?.() ?? null;
    const mapKey = title ?? "";
    let group = byTitle.get(mapKey);
    if (!group) {
      group = { title, items: [] };
      byTitle.set(mapKey, group);
      groups.push(group);
    }
    group.items.push(descriptor);
  }
  return groups;
};
