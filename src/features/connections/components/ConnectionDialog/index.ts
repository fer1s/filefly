import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { ConnectionDialogProps } from "./types";

// Lazy: loads on the first open (see Deferred).
export default lazyWhen<ConnectionDialogProps>(
  () => import("./ConnectionDialog"),
  (props) => props.visible,
);
export type { ConnectionDialogProps } from "./types";
