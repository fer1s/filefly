import { convertFileSrc } from "@tauri-apps/api/core";

import Button from "@/shared/components/elements/Button";
import { t } from "@/lang";

import type { ImageThumbnailSupportProps } from "./types";
import { useThumbnailProbe } from "./useThumbnailProbe";
import "@/styles/components/ImageThumbnailSupport.css";

const ImageThumbnailSupport = (props: ImageThumbnailSupportProps) => {
  const {
    capabilities,
    supported,
    enabled,
    busy,
    sample,
    error,
    probe,
    enable,
    disable,
  } = useThumbnailProbe(props);

  if (supported || (!capabilities && !error)) return null;

  return (
    <div className="image_thumbnail_support" aria-busy={busy}>
      {capabilities && (
        <p>
          {enabled
            ? t.settings.thumbnailQuickLookEnabled(props.extension)
            : t.settings.thumbnailUnsupported(props.extension)}
        </p>
      )}
      {enabled ? (
        <>
          <p>{t.settings.thumbnailReopenFolder}</p>
          <Button className="settings_button" onClick={disable}>
            {t.settings.thumbnailDisable}
          </Button>
        </>
      ) : capabilities?.quickLook ? (
        <Button className="settings_button" onClick={probe} disabled={busy}>
          {busy
            ? t.settings.thumbnailTesting
            : t.settings.thumbnailTryQuickLook}
        </Button>
      ) : (
        capabilities && <p>{t.settings.thumbnailQuickLookMacOnly}</p>
      )}
      {enabled && capabilities && !capabilities.quickLook && (
        <p>{t.settings.thumbnailQuickLookMacOnly}</p>
      )}
      {sample && !enabled && (
        <>
          <img
            src={convertFileSrc(sample)}
            alt={t.settings.thumbnailSampleAlt(props.extension)}
          />
          <p>{t.settings.thumbnailConfirmSample}</p>
          <Button className="settings_button" onClick={enable}>
            {t.settings.thumbnailEnable}
          </Button>
        </>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
};
export default ImageThumbnailSupport;
