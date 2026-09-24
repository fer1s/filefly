import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { PropertiesProps } from "./types";

// Lazy: the dialog chunk loads on the first open (see Deferred). Direct imports of ./Properties
// stay eager (the detached window uses PropertiesContent directly).
export default lazyWhen<PropertiesProps>(
  () => import("./Properties"),
  (props) => props.visible,
);
export type { PropertiesProps } from "./types";
