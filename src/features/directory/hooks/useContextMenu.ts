import { useEffect, useRef, useState } from "react";

export type ContextMenuElementType = "file" | "dir" | "none";

// Context-menu state: visibility, the targeted element (id + type) and positioning.
// Closes itself on any outside click.
export const useContextMenu = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [elementID, setElementID] = useState("");
  const [elementType, setElementType] =
    useState<ContextMenuElementType>("none");

  useEffect(() => {
    const handleClose = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setVisible(false);
    };

    document.addEventListener("click", handleClose);
    return () => document.removeEventListener("click", handleClose);
  }, []);

  // Open the menu at a screen position for a given element.
  const openAt = (
    x: number,
    y: number,
    id: string,
    type: ContextMenuElementType,
  ) => {
    setElementID(id);
    setElementType(type);
    if (ref.current) {
      ref.current.style.left = `${x}px`;
      ref.current.style.top = `${y}px`;
    }
    setVisible(true);
  };

  return {
    ref,
    visible,
    setVisible,
    elementID,
    setElementID,
    elementType,
    setElementType,
    openAt,
  };
};
