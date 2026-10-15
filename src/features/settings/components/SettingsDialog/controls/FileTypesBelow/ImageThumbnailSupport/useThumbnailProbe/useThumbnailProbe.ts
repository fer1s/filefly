import { useEffect, useRef, useState } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { useFilePicker } from "@/shared/providers/FilePickerProvider";
import type { ThumbnailCapabilities } from "@/shared/services/api";
import { t } from "@/lang";

import type { ImageThumbnailSupportProps } from "../types";

export const useThumbnailProbe = ({
  extension,
  settings,
  update,
}: ImageThumbnailSupportProps) => {
  const { fs } = useStateContext();
  const { pickFile } = useFilePicker();
  const [capabilities, setCapabilities] =
    useState<ThumbnailCapabilities | null>(null);
  const [busy, setBusy] = useState(false);
  const [sample, setSample] = useState<string | null>(null);
  const [error, setError] = useState("");
  const active = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    active.current = true;
    let cancelled = false;
    fs.getThumbnailCapabilities().then(
      (value) => {
        if (!cancelled) setCapabilities(value);
      },
      () => {
        if (!cancelled) setError(t.settings.thumbnailCapabilitiesError);
      },
    );
    return () => {
      cancelled = true;
      active.current = false;
    };
  }, [fs]);

  const enabled = settings.quickLookThumbnailExtensions.includes(extension);
  const supported = capabilities?.imageExtensions.includes(extension) ?? false;

  const probe = async () => {
    if (pending.current || !capabilities?.quickLook) return;
    pending.current = true;
    setBusy(true);
    setSample(null);
    setError("");
    try {
      const path = await pickFile({ extensions: [extension] });
      if (!path || !active.current) return;
      // The picker filter is only a convenience; reject a mismatched sample explicitly.
      if (path.split(".").pop()?.toLowerCase() !== extension) {
        setError(t.settings.thumbnailWrongSample(extension));
        return;
      }
      const thumbnail = await fs.probeQuickLookThumbnail(path);
      if (active.current) setSample(thumbnail);
    } catch {
      if (active.current) setError(t.settings.thumbnailProbeError);
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  };

  const enable = () => {
    if (!sample || enabled) return;
    update({
      quickLookThumbnailExtensions: [
        ...settings.quickLookThumbnailExtensions,
        extension,
      ],
    });
    setSample(null);
  };

  const disable = () =>
    update({
      quickLookThumbnailExtensions:
        settings.quickLookThumbnailExtensions.filter(
          (value) => value !== extension,
        ),
    });

  return {
    capabilities,
    supported,
    enabled,
    busy,
    sample,
    error,
    probe,
    enable,
    disable,
  };
};
