import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { ConnectionAuthDialogProps } from "./types";

// Lazy: loads the first time a connection needs interactive re-auth (`connection` non-null).
export default lazyWhen<ConnectionAuthDialogProps>(
  () => import("./ConnectionAuthDialog"),
  (props) => props.connection !== null,
);
export type { ConnectionAuthDialogProps } from "./types";
