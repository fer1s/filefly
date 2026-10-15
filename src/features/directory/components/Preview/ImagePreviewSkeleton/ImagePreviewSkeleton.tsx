import { t } from "@/lang";

import "@/styles/components/ImagePreviewSkeleton.css";

const ImagePreviewSkeleton = () => (
  <div
    className="image_preview_skeleton"
    role="status"
    aria-label={t.imagePreview.loading}
    aria-busy="true"
  />
);

export default ImagePreviewSkeleton;
