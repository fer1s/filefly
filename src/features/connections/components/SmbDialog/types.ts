import type { SMB_PROBE_STATE, SMB_SHARES_STATE } from "./constants";

export type SmbProbeState =
  (typeof SMB_PROBE_STATE)[keyof typeof SMB_PROBE_STATE];

export type SmbSharesState =
  (typeof SMB_SHARES_STATE)[keyof typeof SMB_SHARES_STATE];

// A share the dialog opens prefilled to edit/reconnect (vs a blank add). When set, the dialog shows
// the "update" title + a reconnect hint and seeds its fields from these values.
export type SmbDialogInitial = {
  name: string;
  host: string;
  share: string;
};

export type SmbDialogProps = {
  visible: boolean;
  // When set, edit/reconnect an existing location (fields prefilled) instead of adding a new one.
  initial?: SmbDialogInitial | null;
  // Persist the location. Receives the raw host, share and optional display name. May throw; the
  // dialog surfaces the error and stays open.
  onSubmit: (host: string, share: string, name: string) => Promise<void>;
  onClose: () => void;
};
