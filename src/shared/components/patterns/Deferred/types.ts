import type { ComponentType, ReactNode } from "react";

export type MountOnceProps = {
  // Mount the children the first time this is true; keep them mounted afterwards.
  when: boolean;
  children: ReactNode;
};

// A dynamic import of a module whose default export is the component.
export type ComponentLoader<P> = () => Promise<{ default: ComponentType<P> }>;
