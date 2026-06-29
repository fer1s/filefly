import { DirEntry } from "@/shared/models";

export type PropertiesProps = {
  entry: DirEntry | null;
  visible: boolean;
  onClose: () => void;
};

export type PropertiesContentProps = {
  entry: DirEntry;
};
