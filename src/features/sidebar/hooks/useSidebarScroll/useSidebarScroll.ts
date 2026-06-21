import { useEffect } from "react";

import { useStateContext } from "@/shared/providers/StateProvider";
import { SCROLL_THRESHOLD } from "./constants";

// Reflect whether the sidebar has scrolled into the shared state (used to fade the app-bar title).
export const useSidebarScroll = () => {
  const { setSidebarScrolled } = useStateContext();

  useEffect(() => {
    const sidebar = document.querySelector(".SideBar");
    const handleScroll = () => {
      if (!sidebar) return;
      setSidebarScrolled(sidebar.scrollTop > SCROLL_THRESHOLD);
    };

    if (sidebar) sidebar.addEventListener("scroll", handleScroll);

    return () => {
      if (!sidebar) return;
      sidebar.removeEventListener("scroll", handleScroll);
    };
  }, [setSidebarScrolled]);
};
