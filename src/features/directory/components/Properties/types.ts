import { DirEntry } from "@/shared/models";

export type PropertiesProps = {
  entry: DirEntry | null;
  visible: boolean;
  onClose: () => void;
};
