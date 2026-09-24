import { lazy } from "react";

import MountOnce from "./MountOnce";
import type { ComponentLoader } from "./types";

// Drop-in lazy wrapper for a prop-driven dialog: same props as the real component, but its chunk
// is only loaded the first time `isOpen(props)` is true (typically `props.visible`). Use it as the
// module's public default export so call sites don't change.
export const lazyWhen = <P extends object>(
  load: ComponentLoader<P>,
  isOpen: (props: P) => boolean,
) => {
  const Lazy = lazy(load);
  const Deferred = (props: P) => (
    <MountOnce when={isOpen(props)}>
      <Lazy {...props} />
    </MountOnce>
  );
  return Deferred;
};
