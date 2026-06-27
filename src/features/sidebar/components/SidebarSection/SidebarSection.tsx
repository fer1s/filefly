import { useState } from "react";

import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";

import { faChevronDown } from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SidebarSection.css";

import type { SidebarSectionProps } from "./types";

// A sidebar group whose header toggles its content like an accordion. In the collapsed icon
// rail the header is hidden and the content is always shown (the accordion state is ignored).
const SidebarSection = ({
  title,
  children,
  hideWhenCollapsed = false,
}: SidebarSectionProps) => {
  const [open, setOpen] = useState(true);

  return (
    <section
      className={classNames(
        "SidebarSection",
        hideWhenCollapsed && "hide_when_collapsed",
        !open && "closed",
      )}
    >
      <button
        type="button"
        className="section_header"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <h2>{title}</h2>
        <Icon icon={faChevronDown} />
      </button>
      <div className="section_content">
        <div className="section_content_inner">{children}</div>
      </div>
    </section>
  );
};

export default SidebarSection;
