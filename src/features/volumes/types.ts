import { Volume } from "@/shared/models";

// Props shared by the grid card and the list row renderers of a volume.
export type VolumeItemProps = {
  volume: Volume;
  setPath: (path: string) => void;
  selected: boolean;
  onSelect: () => void;
};
