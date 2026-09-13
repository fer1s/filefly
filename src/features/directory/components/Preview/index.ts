import { lazyWhen } from "@/shared/components/patterns/Deferred";

import type { PreviewProps } from "./types";

// Lazy: the preview (markdown/image/audio viewers + find bar) loads on the first open. The
// detached PreviewWindow imports ./Preview directly, so its own window stays eager.
export default lazyWhen<PreviewProps>(
  () => import("./Preview"),
  (props) => props.previewVisible,
);
export type { PreviewProps } from "./types";
