import { useState } from "react";

import { ENTRY_KIND, type EntryKind } from "@/shared/constants";

// State for the hover "details" popup: which entry is highlighted and whether the
// popup is showing. Driven by the entry rows (mouse enter/leave) via the setters.
export const useDetailsPopup = () => {
  const [visible, setVisible] = useState(false);
  const [id, setId] = useState("");
  const [type, setType] = useState<EntryKind>(ENTRY_KIND.NONE);

  return { visible, setVisible, id, setId, type, setType };
};
