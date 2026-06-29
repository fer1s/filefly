import { useState } from "react";

import PathCrumbs from "../PathCrumbs";
import PathInput from "../PathInput";
import type { PathFieldProps } from "./types";

// The PathBar's central field: breadcrumbs by default, switching to the editable path input when
// the empty area is clicked (for copy/paste). The parent remounts this via `key={path}` on every
// navigation, which resets it back to breadcrumb mode.
const PathField = ({ path, onCommit }: PathFieldProps) => {
  const [editing, setEditing] = useState(false);

  if (editing)
    return (
      <PathInput
        path={path}
        onCommit={onCommit}
        autoFocus
        onExit={() => setEditing(false)}
      />
    );

  return (
    <PathCrumbs
      path={path}
      onNavigate={onCommit}
      onEditRequest={() => setEditing(true)}
    />
  );
};

export default PathField;
