import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { NetworkAddChooserProps } from "./types";

// Lazy: loads on the first open (see Deferred).
export default lazyWhen<NetworkAddChooserProps>(
  () => import("./NetworkAddChooser"),
  (props) => props.visible,
);
export type { NetworkAddChooserProps } from "./types";
