import { RESIZE_HANDLES } from "./constants";
import type { PreviewResizeHandlesProps } from "./types";

// The panel's 8 resize handles (4 edges + 4 corners). Each spreads the shared resize binder with
// the edges it drives; all sizing math lives in usePanelGeometry.
const PreviewResizeHandles = ({ bind }: PreviewResizeHandlesProps) => (
  <>
    {RESIZE_HANDLES.map(({ cls, dir }) => (
      <div key={cls} className={`preview_resize ${cls}`} {...bind(dir)} />
    ))}
  </>
);

export default PreviewResizeHandles;
