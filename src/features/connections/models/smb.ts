import type { SMB_OPEN_RESULT } from "../constants";

// A parsed saved SMB location. `name` is the display label (the user's chosen name, or the share
// name when none was given). `path` is the exact string stored as a sidebar custom item.
export type SmbLocation = {
  host: string;
  share: string;
  name: string;
  path: string;
};

export type SmbOpenResult =
  (typeof SMB_OPEN_RESULT)[keyof typeof SMB_OPEN_RESULT];
