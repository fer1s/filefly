import type { CustomActionIcon, CustomActionTarget } from "@/shared/constants";

export type ContextActionDraft = {
  id: string;
  label: string;
  icon: CustomActionIcon;
  targets: CustomActionTarget[];
  extensions: string;
  command: string;
  args: string;
  enabled: boolean;
};
