import { useSidebarResize } from "../../hooks/useSidebarResize";

import "@/styles/components/SidebarResizeHandle.css";

// Thin drag strip sitting over the sidebar's right edge. Rendered as a sibling of the sidebar in
// the .App grid (not inside it, which clips/scrolls), positioned via the --sidebar-width var.
// Only mounted in the expanded state (see App.tsx).
const SidebarResizeHandle = () => {
  const { onPointerDown } = useSidebarResize();

  return (
    <div
      className="SidebarResizeHandle"
      role="separator"
      aria-orientation="vertical"
      onPointerDown={onPointerDown}
    />
  );
};

export default SidebarResizeHandle;
