import { classNames } from "@/shared/utils";

import { SETTINGS_SECTIONS } from "../../schema";
import type { SettingsNavProps } from "./types";

// The left category rail (VS Code style). Selecting a section jumps the panel to it (and clears any
// active search, handled by the parent).
const SettingsNav = ({ active, counts, onSelect }: SettingsNavProps) => (
  <nav className="settings_nav">
    {SETTINGS_SECTIONS.map((section) => (
      <button
        key={section.id}
        type="button"
        className={classNames(
          "settings_nav_item",
          section.id === active && "active",
          counts[section.id] === 0 && "empty",
        )}
        onClick={() => onSelect(section.id)}
      >
        {section.label()}
      </button>
    ))}
  </nav>
);

export default SettingsNav;
