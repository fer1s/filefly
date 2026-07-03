import type { NewConnection } from "@/shared/services/api";

export type ConnectionDialogProps = {
  visible: boolean;
  // Persist the connection. May throw; the dialog surfaces the error and stays open.
  onSubmit: (connection: NewConnection) => Promise<void>;
  onClose: () => void;
};
