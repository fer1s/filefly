import type { EntryKind } from "@/shared/constants";

export type DetailsPopupProps = {
  visible: boolean;
  id: string;
  type: EntryKind;
};
