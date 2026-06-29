import Popup from "@/shared/components/patterns/Popup";

import "@/styles/components/TypeaheadPopup.css";

import type { TypeaheadPopupProps } from "./types";

// Type-to-find feedback: shows what the user has typed while jumping to matching entries.
const TypeaheadPopup = ({ query }: TypeaheadPopupProps) => (
  <Popup
    visible={Boolean(query)}
    className="typeahead_popup"
    interactive={false}
  >
    <p>{query}</p>
  </Popup>
);

export default TypeaheadPopup;
