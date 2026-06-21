import { Volume } from "@/shared/models";

export type VolumeItemProps = {
  volume: Volume;
  setPath: (path: string) => void;
  index: number;
  collapsed: boolean;
};
