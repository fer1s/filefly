import { useEffect, useState, type RefObject } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

import { useStateContext } from "@/shared/providers/StateProvider";
import { extension } from "@/shared/utils";

import {
  IMAGE_DECODE_TIMEOUT_MS,
  IMAGE_PREPARATION_TIMEOUT_MS,
  NATIVE_ONLY_EXTENSIONS,
} from "./constants";
import { waitForImageOperation } from "./utils";

// Own the displayed element's source so access is granted before the WebView requests it.
// A failed/stalled direct decode gets one native fallback, never an unbounded retry loop.
export const useImageLoad = (
  imageRef: RefObject<HTMLImageElement | null>,
  path: string,
) => {
  const { fs } = useStateContext();
  const [result, setResult] = useState<{
    path: string;
    failed: boolean;
    fallback: boolean;
  } | null>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    const controller = new AbortController();
    const { signal } = controller;

    const load = async (fallback: boolean) => {
      const localPath = await waitForImageOperation(
        fs.prepareImagePreview(path, fallback),
        IMAGE_PREPARATION_TIMEOUT_MS,
        signal,
      );
      if (signal.aborted) return;
      image.src = convertFileSrc(localPath);
      await waitForImageOperation(
        image.decode(),
        IMAGE_DECODE_TIMEOUT_MS,
        signal,
      );
      if (!signal.aborted) setResult({ path, failed: false, fallback });
    };

    // Known-undecodable formats go straight to the native fallback; the rest get one direct try.
    const nativeOnly = NATIVE_ONLY_EXTENSIONS.has(extension(path));
    void (async () => {
      try {
        await load(nativeOnly);
      } catch {
        if (signal.aborted) return;
        try {
          if (nativeOnly) throw new Error("Native image preview failed");
          await load(true);
        } catch {
          if (!signal.aborted)
            setResult({ path, failed: true, fallback: false });
        }
      }
    })();

    // Navigation can unmount this element while its decode is still pending.
    return () => {
      controller.abort();
      image.removeAttribute("src");
    };
  }, [imageRef, path, fs]);

  const settled = result?.path === path;
  return {
    loading: !settled,
    failed: settled && result.failed,
    ready: settled && !result.failed,
    fallback: settled && result.fallback,
  };
};
