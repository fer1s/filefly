import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

import Button from "@/shared/components/elements/Button";
import Icon from "@/shared/components/elements/Icon";
import { classNames } from "@/shared/utils";

import "@/styles/components/PathCrumbs.css";

import { buildCrumbs } from "./utils";
import type { PathCrumbsProps } from "./types";

// Breadcrumb view of the current path: one clickable crumb per segment with a chevron between
// them. Clicking a crumb navigates to that ancestor; clicking the empty area opens the editable
// path input (so the raw path can be copied/pasted). The current (last) crumb is a no-op.
const PathCrumbs = ({ path, onNavigate, onEditRequest }: PathCrumbsProps) => {
  const crumbs = buildCrumbs(path);

  return (
    <div className="PathCrumbs shadow" onClick={onEditRequest}>
      {crumbs.map((crumb, index) => {
        const isCurrent = index === crumbs.length - 1;
        return (
          <span className="crumb_group" key={crumb.path}>
            <Button
              className={classNames("crumb", isCurrent && "current")}
              // Stop propagation so a crumb click never falls through to the edit handler.
              onClick={(event) => {
                event.stopPropagation();
                if (!isCurrent) onNavigate(crumb.path);
              }}
            >
              {crumb.label}
            </Button>
            {!isCurrent && (
              <Icon className="crumb_separator" icon={faChevronRight} />
            )}
          </span>
        );
      })}
    </div>
  );
};

export default PathCrumbs;
