import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { SmbDialogProps } from "./types";

// Lazy: loads on the first open (see Deferred).
export default lazyWhen<SmbDialogProps>(
  () => import("./SmbDialog"),
  (props) => props.visible,
);
export type { SmbDialogProps } from "./types";
