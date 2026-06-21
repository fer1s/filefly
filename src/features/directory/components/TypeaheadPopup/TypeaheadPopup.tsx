import Popup from "@/shared/components/patterns/Popup";

import "@/styles/components/TypeaheadPopup.css";

import type { TypeaheadPopupProps } from "./types";

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
