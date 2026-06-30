import {
  Children,
  Fragment,
  forwardRef,
  useState,
  type ReactElement,
} from "react";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";
import { t } from "@/lang";

import {
  faChevronDown,
  faGripVertical,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";

import "@/styles/components/SidebarSection.css";

import { useSectionRename } from "./useSectionRename";
import type { SidebarSectionProps } from "./types";

// A sidebar group whose chevron toggles its content like an accordion. In the collapsed icon
// rail the header is hidden and the content is always shown (the accordion state is ignored).
// Editable groups (with `onRename` / `onAddItem`) gain an inline-rename title and "add item"
// affordances between rows; read-only groups (e.g. Volumes) just toggle. In edit mode a grip
// handle (when `dragHandleProps` is given) lets the group be drag-reordered.
const SidebarSection = forwardRef<HTMLElement, SidebarSectionProps>(
  (
    {
      title,
      children,
      hideWhenCollapsed = false,
      editing = false,
      style,
      dragging = false,
      dragHandleProps,
      onRename,
      onAddItem,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(true);
    const {
      editing: renaming,
      inputRef,
      start: startRename,
      cancel: cancelRename,
      handleKeyDown: handleRenameKeyDown,
    } = useSectionRename(title, onRename);

    const toggle = () => setOpen((prev) => !prev);

    // An "add item" affordance for the gap at `index`; only rendered in edit mode. Full-width
    // button with a centered plus flanked by dashed rules (----- + -----), revealed on hover.
    const insertAt = (index: number) => (
      <div key={`insert-${index}`} className="section_insert">
        <Button
          className="section_insert_button"
          onClick={() => onAddItem?.(index)}
          aria-label={t.sidebar.addItem}
        >
          <Icon icon={faPlus} />
        </Button>
      </div>
    );

    const items = Children.toArray(children);

    return (
      <section
        ref={ref}
        style={style}
        className={classNames(
          "SidebarSection",
          hideWhenCollapsed && "hide_when_collapsed",
          !open && "closed",
          editing && "editing",
          // Editable groups (rename / add items) get dashed item outlines; Volumes does not.
          (onRename || onAddItem) && "editable",
          dragging && "dragging",
        )}
      >
        <div className="section_header">
          {editing && dragHandleProps && (
            <span
              className="section_grip"
              aria-label={t.sidebar.dragToReorder}
              {...dragHandleProps}
            >
              <Icon icon={faGripVertical} />
            </span>
          )}
          {renaming ? (
            <input
              ref={inputRef}
              type="text"
              className="section_title_input"
              defaultValue={title}
              onKeyDown={handleRenameKeyDown}
              onBlur={cancelRename}
            />
          ) : (
            <button
              type="button"
              className="section_title"
              // Editable groups open the rename input on click; read-only groups just toggle.
              onClick={onRename ? startRename : toggle}
            >
              <h2>{title}</h2>
            </button>
          )}
          <button
            type="button"
            className="section_chevron"
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? t.sidebar.collapseGroup : t.sidebar.expandGroup}
          >
            <Icon icon={faChevronDown} />
          </button>
        </div>
        <div className="section_content">
          <div className="section_content_inner">
            {editing && onAddItem
              ? [
                  insertAt(0),
                  ...items.map((child, index) => (
                    <Fragment key={(child as ReactElement).key ?? index}>
                      {child}
                      {insertAt(index + 1)}
                    </Fragment>
                  )),
                ]
              : children}
          </div>
        </div>
      </section>
    );
  },
);

SidebarSection.displayName = "SidebarSection";

export default SidebarSection;
