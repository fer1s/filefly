import { useLayoutEffect, useState, type RefObject } from "react";

import { IMAGE_ROTATION_HALF } from "../constants";
import { clampNum } from "../utils";

// Observe layout boxes, which stay independent of the visual CSS transform.
export const useImageGeometry = (
  imageRef: RefObject<HTMLImageElement | null>,
  rotation: number,
  zoom: number,
) => {
  const [bounds, setBounds] = useState({
    width: 0,
    height: 0,
    viewportWidth: 0,
    viewportHeight: 0,
  });

  useLayoutEffect(() => {
    const image = imageRef.current;
    const viewport = image?.parentElement;
    if (!image || !viewport) return;
    const measure = () => {
      const next = {
        width: image.offsetWidth,
        height: image.offsetHeight,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
      };
      setBounds((current) =>
        current.width === next.width &&
        current.height === next.height &&
        current.viewportWidth === next.viewportWidth &&
        current.viewportHeight === next.viewportHeight
          ? current
          : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(image);
    observer.observe(viewport);
    image.addEventListener("load", measure);
    measure();
    return () => {
      observer.disconnect();
      image.removeEventListener("load", measure);
    };
  }, [imageRef]);

  const swapped = rotation % IMAGE_ROTATION_HALF !== 0;
  const width = swapped ? bounds.height : bounds.width;
  const height = swapped ? bounds.width : bounds.height;
  // Quarter turns swap the visual axes; fit again before applying the user's zoom.
  const fit =
    width && height && bounds.viewportWidth && bounds.viewportHeight
      ? Math.min(
          1,
          bounds.viewportWidth / width,
          bounds.viewportHeight / height,
        )
      : 1;
  const scale = fit * zoom;
  const maxX = Math.max(0, (width * scale - bounds.viewportWidth) / 2);
  const maxY = Math.max(0, (height * scale - bounds.viewportHeight) / 2);
  const clampPan = (pan: { x: number; y: number }) => ({
    x: clampNum(pan.x, -maxX, maxX),
    y: clampNum(pan.y, -maxY, maxY),
  });

  return { scale, clampPan };
};
