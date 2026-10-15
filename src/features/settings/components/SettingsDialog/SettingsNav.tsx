import Button from "@/shared/components/elements/Button";
import { classNames } from "@/shared/utils";

import { SETTINGS_SECTIONS } from "../../schema";
import type { SettingsNavProps } from "./types";

// The left category rail (VS Code style). Selecting a section jumps the panel to it (and clears any
// active search, handled by the parent).
const SettingsNav = ({
  active,
  counts,
  subsections,
  onSelect,
}: SettingsNavProps) => (
  <nav className="settings_nav">
    {SETTINGS_SECTIONS.map((section) => (
      <div key={section.id} className="settings_nav_group">
        <Button
          unstyled
          className={classNames(
            "settings_nav_item",
            section.id === active && "active",
            counts[section.id] === 0 && "empty",
          )}
          onClick={() => onSelect(section.id)}
        >
          {section.label()}
        </Button>
        {subsections
          .find((group) => group.section === section.id)
          ?.items.map((sub) => (
            <Button
              key={sub.key}
              unstyled
              className="settings_nav_item settings_nav_subsection"
              onClick={() => onSelect(section.id, sub.key)}
            >
              {sub.title}
            </Button>
          ))}
      </div>
    ))}
  </nav>
);

export default SettingsNav;
