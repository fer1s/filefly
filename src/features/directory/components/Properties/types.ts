import type { ReactNode } from "react";

import { DirEntry } from "@/shared/models";

// One metadata row: a label and its value. Used throughout PropertiesContent.
export type PropertyRowProps = {
  label: string;
  value: ReactNode;
};

export type PropertiesProps = {
  entry: DirEntry | null;
  visible: boolean;
  onClose: () => void;
};

export type PropertiesContentProps = {
  entry: DirEntry;
};
