import { classNames } from "@/shared/utils";

import "@/styles/components/SidebarSection.css";

import type { SidebarSectionProps } from "./types";

const SidebarSection = ({
  title,
  children,
  hideWhenCollapsed = false,
}: SidebarSectionProps) => (
  <section
    className={classNames(
      "SidebarSection",
      hideWhenCollapsed && "hide_when_collapsed",
    )}
  >
    <h2>{title}</h2>
    <div className="section_content">{children}</div>
  </section>
);

export default SidebarSection;
